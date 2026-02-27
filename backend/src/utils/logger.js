const Log = require('../models/Log')
const mongoose = require('mongoose')

/**
 * Get caller information from stack trace
 * @param {Error} error - Error object with stack trace
 * @returns {Object} - Object with fileName, lineNumber, and functionName
 */
function getCallerInfo(error) {
  const stack = error.stack || ''
  const stackLines = stack.split('\n')
  
  // Skip the first line (Error message) and logger.js itself
  // Look for the first file that's not logger.js, node_modules, or internal
  for (let i = 1; i < stackLines.length; i++) {
    const line = stackLines[i]
    // Match file paths like: at functionName (file:///path/to/file.js:123:45)
    // or: at /path/to/file.js:123:45
    // or: at Object.functionName (/path/to/file.js:123:45)
    const match = line.match(/at\s+(?:(.+?)\s+\()?([^\s()]+):(\d+):(\d+)\)?/)
    if (match) {
      const functionName = match[1] || 'anonymous'
      const filePath = match[2]
      const lineNumber = parseInt(match[3], 10)
      
      // Skip node_modules, internal Node.js files, and logger.js itself
      if (filePath && 
          !filePath.includes('node_modules') && 
          !filePath.includes('internal/') &&
          !filePath.includes('logger.js')) {
        // Extract just the filename from the path
        const fileName = filePath.split(/[/\\]/).pop()
        // Clean up function name (remove Object. prefix if present)
        const cleanFunctionName = functionName.replace(/^Object\./, '').trim()
        return {
          fileName,
          lineNumber,
          functionName: cleanFunctionName || 'anonymous',
          fullPath: filePath,
        }
      }
    }
  }
  
  // Fallback if we can't parse the stack
  return {
    fileName: 'unknown',
    lineNumber: 0,
    functionName: 'unknown',
    fullPath: 'unknown',
  }
}

/**
 * Create a log entry in the database
 * @param {Object} options - Log options
 * @param {String} options.action - Action being logged (e.g., 'create-issue')
 * @param {String} options.type - Type of log ('issue-creation-organization' or 'issue-creation-public')
 * @param {String} options.message - Log message
 * @param {String} options.issueId - Optional issue ID
 * @param {String} options.userId - Optional user ID
 * @param {String} options.clientId - Optional client ID
 * @param {Object} options.metadata - Optional additional metadata
 */
async function createLog(options) {
  try {
    // Get caller information
    const error = new Error()
    const callerInfo = getCallerInfo(error)
    
    // Validate required fields
    if (!options.action || !options.type || !options.message) {
      console.error('Log creation failed: Missing required fields', options)
      return null
    }
    
    const logData = {
      action: options.action,
      type: options.type,
      level: options.level || 'info',
      fileName: callerInfo.fileName,
      lineNumber: callerInfo.lineNumber,
      functionName: callerInfo.functionName,
      message: options.message,
      errorStack: options.errorStack || null,
      errorName: options.errorName || null,
      issueId: options.issueId && mongoose.Types.ObjectId.isValid(options.issueId) 
        ? new mongoose.Types.ObjectId(options.issueId) 
        : null,
      userId: options.userId && mongoose.Types.ObjectId.isValid(options.userId)
        ? new mongoose.Types.ObjectId(options.userId)
        : null,
      clientId: options.clientId && mongoose.Types.ObjectId.isValid(options.clientId)
        ? new mongoose.Types.ObjectId(options.clientId)
        : null,
      metadata: options.metadata || {},
    }
    
    // Only log to console in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating log entry:', {
        action: logData.action,
        type: logData.type,
        fileName: logData.fileName,
        lineNumber: logData.lineNumber,
        issueId: logData.issueId,
        userId: logData.userId,
        clientId: logData.clientId,
      })
    }
    
    const log = await Log.create(logData)
    
    // Only log to console in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Log entry created successfully:', log._id)
    }
    
    return log
  } catch (error) {
    // Don't throw errors from logging - just log to console with more details
    // Always log errors (even in production) as they indicate a problem
    console.error('Failed to create log entry:', error.message)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error stack:', error.stack)
      console.error('Log options:', options)
    }
    return null
  }
}

/**
 * Log issue creation (Web) - Created from React web application
 */
async function logIssueCreationOrganization(issueId, userId, clientId, metadata = {}) {
  return createLog({
    action: 'create-issue',
    type: 'issue-creation-organization',
    message: `Issue created from React web application by user: ${userId}`,
    issueId,
    userId,
    clientId,
    metadata: {
      ...metadata,
      source: 'react-web',
      platform: 'web',
      frontend: 'react',
    },
  })
}

/**
 * Log issue creation (Public/QR Code) - Created from public React page (PublicIssueReport.tsx)
 */
async function logIssueCreationPublic(issueId, clientId, metadata = {}) {
  return createLog({
    action: 'create-issue',
    type: 'issue-creation-public',
    message: `Issue created from public React page (QR code scan)`,
    issueId,
    userId: null,
    clientId,
    metadata: {
      ...metadata,
      source: 'react-public',
      platform: 'public',
      frontend: 'react',
      page: 'PublicIssueReport',
    },
  })
}

/**
 * Log issue creation (Mobile) - Created from mobile API
 */
async function logIssueCreationMobile(issueId, userId, clientId, metadata = {}) {
  return createLog({
    action: 'create-issue',
    type: 'issue-creation-mobile',
    message: `Issue created from mobile API by user: ${userId}`,
    issueId,
    userId,
    clientId,
    metadata: {
      ...metadata,
      source: 'mobile-api',
      platform: 'mobile',
      frontend: 'mobile-app',
    },
  })
}

/**
 * Log an error
 * @param {Error} error - The error object
 * @param {Object} context - Additional context (userId, clientId, metadata, etc.)
 */
async function logError(error, context = {}) {
  const errorMessage = error.message || 'Unknown error'
  const errorStack = error.stack || ''
  const errorName = error.name || 'Error'
  
  return createLog({
    action: 'error',
    type: 'error',
    level: 'error',
    message: errorMessage,
    errorStack,
    errorName,
    userId: context.userId || null,
    clientId: context.clientId || null,
    issueId: context.issueId || null,
    metadata: {
      ...context.metadata,
      errorCode: error.code,
      errorDetails: error.details || {},
    },
  })
}

/**
 * Log a warning
 */
async function logWarning(message, context = {}) {
  return createLog({
    action: 'warning',
    type: 'warning',
    level: 'warning',
    message,
    userId: context.userId || null,
    clientId: context.clientId || null,
    issueId: context.issueId || null,
    metadata: context.metadata || {},
  })
}

/**
 * Log informational message
 */
async function logInfo(message, context = {}) {
  return createLog({
    action: 'info',
    type: 'info',
    level: 'info',
    message,
    userId: context.userId || null,
    clientId: context.clientId || null,
    issueId: context.issueId || null,
    metadata: context.metadata || {},
  })
}

module.exports = {
  createLog,
  logIssueCreationOrganization,
  logIssueCreationPublic,
  logIssueCreationMobile,
  logError,
  logWarning,
  logInfo,
}

