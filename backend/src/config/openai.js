const OpenAI = require('openai')
const UnclearImageSubmission = require('../models/UnclearImageSubmission')
const crypto = require('crypto')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Calculate hash of image from URL (downloads and hashes the image)
const calculateImageHash = async (imageUrl) => {
  if (!imageUrl) return null
  
  try {
    const fetchImpl = typeof fetch !== 'undefined'
      ? fetch
      : (await import('node-fetch')).default
    
    const response = await fetchImpl(imageUrl)
    if (!response.ok) {
      console.error(`Failed to fetch image for hashing: ${response.status}`)
      return null
    }
    
    // Handle both native fetch and node-fetch
    let buffer
    if (response.buffer) {
      // node-fetch v2
      buffer = await response.buffer()
    } else if (response.arrayBuffer) {
      // native fetch or node-fetch v3
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      // Fallback: try to get body as stream and convert
      const chunks = []
      for await (const chunk of response.body) {
        chunks.push(chunk)
      }
      buffer = Buffer.concat(chunks)
    }
    
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    return hash
  } catch (error) {
    console.error('Error calculating image hash:', error)
    return null
  }
}

// Calculate hash from file buffer (when file is available before upload)
const calculateImageHashFromBuffer = (fileBuffer) => {
  if (!fileBuffer) return null
  try {
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    return hash
  } catch (error) {
    console.error('Error calculating image hash from buffer:', error)
    return null
  }
}

// Check if the same image has been submitted 3+ times with REQUIRES_USER_INPUT
// Now checks by image hash instead of URL to detect same image even with different URLs
// Checks for both 'image_unclear' and 'requires_user_input' reasons
const checkRepeatedUnclearImage = async (imageUrl, imageHash, userId, clientId, publicIdentifier = null, hasDescription = false) => {
  if (!imageUrl || !imageHash) return { isBlocked: false, count: 0 }

  try {
    // Only check if no description provided (user keeps submitting same image without details)
    if (hasDescription) {
      return { isBlocked: false, count: 0 }
    }

    const query = { 
      imageHash, 
      clientId,
      // Check for any REQUIRES_USER_INPUT case (both unclear and general)
      reason: { $in: ['image_unclear', 'requires_user_input'] }
    }
    
    if (userId) {
      query.userId = userId
    } else if (publicIdentifier) {
      query.publicIdentifier = publicIdentifier
    } else {
      // If no identifier, can't track - allow the request
      return { isBlocked: false, count: 0 }
    }

    const count = await UnclearImageSubmission.countDocuments(query)
    
    return {
      isBlocked: count >= 3,
      count
    }
  } catch (error) {
    console.error('Error checking repeated unclear image:', error)
    // On error, allow the request to proceed
    return { isBlocked: false, count: 0 }
  }
}

// Record an image submission that resulted in REQUIRES_USER_INPUT
// Now stores image hash to detect same image even with different URLs
const recordUnclearImageSubmission = async (imageUrl, imageHash, userId, clientId, publicIdentifier = null, reason = 'requires_user_input') => {
  if (!imageUrl || !imageHash) return

  try {
    // Create new submission record with hash and reason
    await UnclearImageSubmission.create({
      imageUrl,
      imageHash,
      userId: userId || null,
      clientId,
      publicIdentifier: publicIdentifier || null,
      reason: reason, // 'image_unclear' or 'requires_user_input'
      submittedAt: new Date()
    })

    // Keep only latest 5 submissions per user/client combination
    const query = { clientId }
    if (userId) {
      query.userId = userId
    } else if (publicIdentifier) {
      query.publicIdentifier = publicIdentifier
    } else {
      return
    }

    // Get all submissions for this user, sorted by date (newest first)
    const allSubmissions = await UnclearImageSubmission.find(query)
      .sort({ submittedAt: -1 })
      .select('_id')
      .lean()

    // If more than 5, delete the oldest ones
    if (allSubmissions.length > 5) {
      const idsToDelete = allSubmissions.slice(5).map(s => s._id)
      await UnclearImageSubmission.deleteMany({ _id: { $in: idsToDelete } })
    }
  } catch (error) {
    console.error('Error recording unclear image submission:', error)
    // Don't throw - logging failure shouldn't block the request
  }
}

const getIssueDetails = async (
  description,
  siteName,
  imageUrl,
  departments = [],
  categories = [],
  priorities = [],
  userId = null,
  clientId = null,
  publicIdentifier = null,
  imageHash = null // Hash of the image content
) => {
  try {
    // Calculate image hash if not provided (download from URL)
    let hash = imageHash
    if (imageUrl && !hash) {
      hash = await calculateImageHash(imageUrl)
    }
    
    // Check if same image (by hash) was submitted 3+ times with REQUIRES_USER_INPUT before calling OpenAI
    // Only block if no description provided (user keeps submitting same image without details)
    const hasDescription = description?.trim()
    if (imageUrl && hash && clientId && !hasDescription) {
      const checkResult = await checkRepeatedUnclearImage(imageUrl, hash, userId, clientId, publicIdentifier, hasDescription)
      if (checkResult.isBlocked) {
        return {
          requiresUserInput: true,
          repeatedSubmission: true,
          reason: "This image has been submitted multiple times without additional details. Please provide a description or submit a different image.",
          submissionCount: checkResult.count
        }
      }
    }
    const prompt = `
You are an expert issue classifier.
Given the ticket below, pick the best department, category, and priority from the provided lists that best matches the issue image or description  or if both provided, the best matches the issue image and description.
Also craft a concise issue title, list the recommended personnel to fix the issue, and highlight potential risks.

STRICT RULES:
1. If description is empty AND the image does not clearly show a recognizable issue, return insufficient information.
2. If an image is provided but it is unclear, blurry, too dark, or you cannot identify any issue from it, return image_unclear: true.
3. Do NOT guess.
4. Do NOT fabricate context.
5. Only classify based on visible evidence.
6. If confidence is below 70, return insufficient information.
7. Choose department, category, and priority ONLY from provided lists.
8. You must respond with valid JSON only.

Ticket description:
${description || "No description provided."}

Image URL: ${imageUrl || 'None'}

Site:
${siteName || "Unknown"}

 Departments (choose one):
${departments.map((d) => `"${d.name || d}"`).join(", ")}

Categories (choose one): 
${categories.map((c) => `"${c.name || c}"`).join(", ")}

Priorities (choose one):
${priorities.map((p) => `"${p}"`).join(", ")}

If the image is provided but unclear/blurry/not analyzable, return:
{
  "image_unclear": true,
  "insufficient_information": true,
  "confidence": number
}

If insufficient information (but image is clear), return:
{
  "insufficient_information": true,
  "confidence": number
}

Otherwise return the following JSON strictly:
{
  "title": "string",
  "priority": "one of provided priority options",
  "assignedCategory": "one of provided categories",
  "assignedDepartment": "one of provided departments",
  "suggestedPersonal": ["role1", "role2"],
  "potentialRisks": ["risk1", "risk2"],
  "confidence": number,
  "suggestedDueDateDays": number
}

For suggestedDueDateDays: Based on the issue priority and type, suggest the number of days from today when this issue should be resolved:
- critical priority: 1-2 days
- high priority: 2-4 days
- medium priority: 5-7 days
- low priority: 7-14 days
If you cannot determine, return null or 1 (default to 1 day).
`;

    const messages = [
      {
        role: "user",
        content: imageUrl
          ? [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          : prompt
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages,
      response_format: { type: "json_object" }
    });

    let parsed;

    try {
      parsed = JSON.parse(response.choices?.[0]?.message?.content || "{}");
    } catch (err) {
      console.error("LLM JSON parse failed:", err);
      return {
        requiresUserInput: true,
        reason: "Invalid AI response"
      };
    }

    // 🚨 If image is unclear → return specific error and record the submission
    if (parsed.image_unclear === true && imageUrl) {
      // Calculate hash if not already calculated
      let hash = imageHash
      if (!hash) {
        hash = await calculateImageHash(imageUrl)
      }
      
      // Record this unclear image submission with hash (only if no description provided)
      const hasDescription = description?.trim()
      if (clientId && hash && !hasDescription) {
        await recordUnclearImageSubmission(imageUrl, hash, userId, clientId, publicIdentifier, 'image_unclear')
      }
      
      return {
        requiresUserInput: true,
        imageUnclear: true,
        reason: "The provided image is unclear, blurry, or cannot be analyzed. Please provide a clearer image or add a description."
      };
    }

    // 🚨 If insufficient or low confidence → ask user for description and record the submission
    if (
      parsed.insufficient_information === true ||
      !parsed.confidence ||
      parsed.confidence < 70
    ) {
      // Record this REQUIRES_USER_INPUT submission (only if image provided and no description)
      const hasDescription = description?.trim()
      if (imageUrl && clientId && !hasDescription) {
        let hash = imageHash
        if (!hash) {
          hash = await calculateImageHash(imageUrl)
        }
        if (hash) {
          await recordUnclearImageSubmission(imageUrl, hash, userId, clientId, publicIdentifier, 'requires_user_input')
        }
      }
      
      return {
        requiresUserInput: true,
        reason: "AI confidence too low or insufficient data"
      };
    }

    // Return AI details including suggestedDueDateDays
    return {
      requiresUserInput: false,
      ...parsed,
      // Ensure suggestedDueDateDays is included in response
      suggestedDueDateDays: parsed.suggestedDueDateDays || null
    };

  } catch (error) {
    console.error("AI classification failed:", error);

    return {
      requiresUserInput: true,
      reason: "AI request failed"
    };
  }
};


// Function to validate the resolution image against raised issue images and details.
// The output should be: { resolved: true/false, aiConfidence: score (0-1), reasoning: "brief analysis", imageComparison: "detailed comparison", gpsMatch: true/false }
const validateResolution = async (
  resolvedDescription,
  resolvedImage,
  raisedIssueImages,
  raisedIssueTitle,
  raisedIssueDescription,
  raisedIssuePriority,
  raisedIssueStatus,
  createdGps = null,
  resolvedGps = null,
  gpsDistance = null
) => {
  const issueImageBlocks = (Array.isArray(raisedIssueImages) ? raisedIssueImages : [])
    .filter(Boolean)
    .map((url, index) => ({
      type: 'image_url',
      image_url: { url },
    }))

  const resolutionImageBlock =
    resolvedImage && resolvedImage.length > 0
      ? [
          {
            type: 'image_url',
            image_url: { url: resolvedImage },
          },
        ]
      : []

  // Build GPS information text
  let gpsInfoText = ''
  if (createdGps && resolvedGps) {
    gpsInfoText = `\n\nGPS Location Verification:\n- Issue Created At: Latitude ${createdGps.latitude.toFixed(6)}, Longitude ${createdGps.longitude.toFixed(6)}\n- Resolution Submitted At: Latitude ${resolvedGps.latitude.toFixed(6)}, Longitude ${resolvedGps.longitude.toFixed(6)}`
    if (gpsDistance !== null) {
      gpsInfoText += `\n- Distance Between Locations: ${Math.round(gpsDistance)} meters (within ${50} meter tolerance)`
    }
  }

  // Build image comparison instructions
  let imageComparisonInstructions = ''
  if (issueImageBlocks.length > 0 && resolutionImageBlock.length > 0) {
    imageComparisonInstructions = `\n\nIMPORTANT: You will see ${issueImageBlocks.length} image(s) showing the ORIGINAL ISSUE, followed by ${resolutionImageBlock.length} image(s) showing the RESOLUTION. Please carefully compare these images to determine:
1. Are the images showing the same location/area?
2. Has the reported issue been fixed or resolved in the resolution image?
3. Are there any remaining problems visible in the resolution image?
4. Does the resolution image provide sufficient evidence that the issue is resolved?`
  } else if (issueImageBlocks.length > 0) {
    imageComparisonInstructions = `\n\nNote: You will see ${issueImageBlocks.length} image(s) showing the ORIGINAL ISSUE, but no resolution image was provided. You must rely on the resolution description to determine if the issue is resolved.`
  } else if (resolutionImageBlock.length > 0) {
    imageComparisonInstructions = `\n\nNote: A resolution image is provided, but no original issue images were available. Evaluate the resolution based on the description and the resolution image.`
  }

  const userContent = [
    {
      type: 'text',
      text: `You are an expert technical evaluator specializing in maintenance and facility management. Your task is to thoroughly compare the raised issue with the proposed resolution evidence and determine if the issue has been properly resolved.

ISSUE DETAILS:
- Title: ${raisedIssueTitle || 'Not provided'}
- Description: ${raisedIssueDescription || 'Not provided'}
- Priority: ${raisedIssuePriority || 'Not specified'}
- Current Status: ${raisedIssueStatus || 'Not specified'}

RESOLUTION PROVIDED:
- Description: ${resolvedDescription || 'Not provided'}${gpsInfoText}${imageComparisonInstructions}

ANALYSIS REQUIREMENTS:
1. If images are provided, carefully compare the original issue images with the resolution image(s)
2. Verify that the resolution addresses all aspects mentioned in the issue description
3. Check if the resolution image shows the same location/area as the issue images
4. Determine if the fix is complete and satisfactory
5. Assess if any additional work or follow-up is needed
6. Consider GPS location verification (if provided) as supporting evidence

Based on your comprehensive analysis, respond ONLY with valid JSON in this exact format:
{
  "resolved": true|false,
  "aiConfidence": number between 0 and 1 (where 1 is completely confident),
  "reasoning": "detailed explanation of your analysis, including what you observed in the images and why you believe the issue is or is not resolved",
  "imageComparison": "detailed comparison of the original issue images vs resolution images, noting similarities, differences, and whether they show the same location",
  "gpsMatch": ${createdGps && resolvedGps ? 'true' : 'null'},
  "missingDetails": ["list any important details that are missing or unclear that would help confirm resolution"]
}`,
    },
    ...issueImageBlocks,
    ...resolutionImageBlock,
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'system',
        content:
          'You are a meticulous maintenance QA assistant with expertise in visual analysis and technical evaluation. You carefully examine images, compare before/after states, and validate whether reported issues have been properly resolved. You provide detailed, evidence-based assessments.',
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  })

  try {
    const result = JSON.parse(response.choices?.[0]?.message?.content || '{}')
    
    // Ensure GPS match is set correctly
    if (createdGps && resolvedGps && gpsDistance !== null) {
      result.gpsMatch = gpsDistance <= 50 // Within tolerance
      result.gpsDistance = Math.round(gpsDistance)
    } else {
      result.gpsMatch = null
    }
    
    return result
  } catch (error) {
    console.error('Failed to parse OpenAI validateResolution response:', error)
    return {
      resolved: false,
      aiConfidence: 0,
      reasoning: 'Failed to parse AI validation response',
      imageComparison: 'Unable to compare images due to processing error',
      gpsMatch: createdGps && resolvedGps && gpsDistance !== null ? gpsDistance <= 50 : null,
    }
  }
}

module.exports = openai
module.exports.getIssueDetails = getIssueDetails
module.exports.validateResolution = validateResolution
module.exports.checkRepeatedUnclearImage = checkRepeatedUnclearImage
module.exports.recordUnclearImageSubmission = recordUnclearImageSubmission
module.exports.calculateImageHash = calculateImageHash
module.exports.calculateImageHashFromBuffer = calculateImageHashFromBuffer
