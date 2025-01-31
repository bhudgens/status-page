#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to parse issue content and extract status information
function parseIssueContent(issueBody) {
  // Define regex patterns to extract key information
  const systemPattern = /### Affected Systems\n\n(.*?)(?:\n\n|$)/s;
  const severityPattern = /### Severity\n\n(critical|major|minor)/;
  const statusPattern = /### Current Status\n\n(investigating|identified|monitoring|resolved)/;

  // Extract information using regex
  const systemMatch = issueBody.match(systemPattern);
  const severityMatch = issueBody.match(severityPattern);
  const statusMatch = issueBody.match(statusPattern);

  // Parse systems (assuming comma-separated or newline-separated list)
  const systems = systemMatch 
    ? systemMatch[1].split(/[,\n]/).map(system => system.trim()).filter(Boolean)
    : [];

  // Return parsed issue information
  return {
    systems: systems,
    severity: severityMatch ? severityMatch[1] : null,
    status: statusMatch ? statusMatch[1] : null
  };
}

// Function to update status.json with issue information
function updateStatusFile(parsedIssue) {
  const statusFilePath = path.join(__dirname, '..', 'data', 'status.json');
  
  try {
    // Read existing status file
    const statusData = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));

    // Update incidents array
    statusData.incidents = statusData.incidents || [];
    
    // Add new incident or update existing
    const existingIncidentIndex = statusData.incidents.findIndex(
      incident => incident.systems.some(
        system => parsedIssue.systems.includes(system)
      )
    );

    const newIncident = {
      id: `inc-${Date.now()}`,
      title: 'Incident Title', // This would ideally come from the issue title
      status: parsedIssue.status,
      severity: parsedIssue.severity,
      systems: parsedIssue.systems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingIncidentIndex !== -1) {
      // Update existing incident
      statusData.incidents[existingIncidentIndex] = {
        ...statusData.incidents[existingIncidentIndex],
        ...newIncident
      };
    } else {
      // Add new incident
      statusData.incidents.push(newIncident);
    }

    // Write updated status file
    fs.writeFileSync(statusFilePath, JSON.stringify(statusData, null, 2));
    
    console.log('Status file updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating status file:', error);
    return false;
  }
}

// Main function to process an issue
function processIssue(issueBody) {
  const parsedIssue = parseIssueContent(issueBody);
  
  if (parsedIssue.systems.length > 0 && parsedIssue.status && parsedIssue.severity) {
    return updateStatusFile(parsedIssue);
  } else {
    console.error('Incomplete issue information');
    return false;
  }
}

// Export functions for potential testing or external use
module.exports = {
  parseIssueContent,
  updateStatusFile,
  processIssue
};

// If run directly, expect issue body from stdin
if (require.main === module) {
  let issueBody = '';
  process.stdin.on('data', (chunk) => {
    issueBody += chunk;
  });
  
  process.stdin.on('end', () => {
    processIssue(issueBody);
  });
}
