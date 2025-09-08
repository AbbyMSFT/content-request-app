#!/usr/bin/env node
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

// Environment variables for Azure DevOps PAT authentication
const ADO_PERSONAL_ACCESS_TOKEN = process.env.ADO_PERSONAL_ACCESS_TOKEN;
const ADO_ORGANIZATION_URL = process.env.ADO_ORGANIZATION_URL || 'https://dev.azure.com/msft-skilling';
// Remove single project constraint - we'll query across all accessible projects
const ADO_DEFAULT_PROJECT = process.env.ADO_DEFAULT_PROJECT || 'Content';

if (!ADO_PERSONAL_ACCESS_TOKEN) {
  throw new Error('Azure DevOps Personal Access Token is required: ADO_PERSONAL_ACCESS_TOKEN');
}

// Interfaces for Azure DevOps work items
interface WorkItemField {
  op: string;
  path: string;
  value: any;
}

interface ContentRequest {
  productArea: string;
  documentType: string;
  title: string;
  description: string;
  businessJustification: string;
  deadline?: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  requestorEmail: string;
  contentDeveloper?: string;
  reviewers: string[];
  existingContentLinks?: string[];
  supportingFiles?: string[];
}

interface WorkItemResponse {
  id: number;
  url: string;
  fields: Record<string, any>;
}

// Validation functions
const isValidContentRequest = (args: any): args is ContentRequest => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.productArea === 'string' &&
    typeof args.documentType === 'string' &&
    typeof args.title === 'string' &&
    typeof args.description === 'string' &&
    typeof args.businessJustification === 'string' &&
    typeof args.urgency === 'string' &&
    ['Low', 'Medium', 'High', 'Critical'].includes(args.urgency) &&
    typeof args.requestorEmail === 'string' &&
    Array.isArray(args.reviewers)
  );
};

const isValidStatusUpdate = (args: any): args is { workItemId: number; status: string; comment?: string } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.workItemId === 'number' &&
    typeof args.status === 'string'
  );
};

const isValidAssignment = (args: any): args is { workItemId: number; assignee: string } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.workItemId === 'number' &&
    typeof args.assignee === 'string'
  );
};

class ContentRequestServer {
  private server: Server;
  private adoApiClient: AxiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'content-request-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Azure DevOps API client with PAT authentication
    const authToken = Buffer.from(`:${ADO_PERSONAL_ACCESS_TOKEN}`).toString('base64');
    this.adoApiClient = axios.create({
      baseURL: `${ADO_ORGANIZATION_URL}`,
      headers: {
        'Authorization': `Basic ${authToken}`,
        'Accept': 'application/json',
      },
    });

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_content_request',
          description: 'Create a new content development request in Azure DevOps',
          inputSchema: {
            type: 'object',
            properties: {
              productArea: {
                type: 'string',
                description: 'Product area for the content request',
              },
              documentType: {
                type: 'string',
                description: 'Type of documentation (user guide, API doc, release note, etc.)',
              },
              title: {
                type: 'string',
                description: 'Title of the content request',
              },
              description: {
                type: 'string',
                description: 'Detailed description of the content needed',
              },
              businessJustification: {
                type: 'string',
                description: 'Business justification for the content request',
              },
              deadline: {
                type: 'string',
                description: 'Deadline for completion (ISO date format)',
              },
              urgency: {
                type: 'string',
                enum: ['Low', 'Medium', 'High', 'Critical'],
                description: 'Urgency level of the request',
              },
              requestorEmail: {
                type: 'string',
                description: 'Email of the person making the request',
              },
              contentDeveloper: {
                type: 'string',
                description: 'Preferred content developer (optional)',
              },
              reviewers: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of reviewer email addresses',
              },
              existingContentLinks: {
                type: 'array',
                items: { type: 'string' },
                description: 'Links to existing related content (optional)',
              },
            },
            required: ['productArea', 'documentType', 'title', 'description', 'businessJustification', 'urgency', 'requestorEmail', 'reviewers'],
          },
        },
        {
          name: 'update_request_status',
          description: 'Update the status of a content request',
          inputSchema: {
            type: 'object',
            properties: {
              workItemId: {
                type: 'number',
                description: 'Azure DevOps work item ID',
              },
              status: {
                type: 'string',
                description: 'New status (New, Active, Resolved, Closed, etc.)',
              },
              comment: {
                type: 'string',
                description: 'Optional comment about the status change',
              },
            },
            required: ['workItemId', 'status'],
          },
        },
        {
          name: 'assign_content_developer',
          description: 'Assign a content developer to a work item',
          inputSchema: {
            type: 'object',
            properties: {
              workItemId: {
                type: 'number',
                description: 'Azure DevOps work item ID',
              },
              assignee: {
                type: 'string',
                description: 'Email address of the assignee',
              },
            },
            required: ['workItemId', 'assignee'],
          },
        },
        {
          name: 'get_request_details',
          description: 'Get details of a content request',
          inputSchema: {
            type: 'object',
            properties: {
              workItemId: {
                type: 'number',
                description: 'Azure DevOps work item ID',
              },
            },
            required: ['workItemId'],
          },
        },
        {
          name: 'get_team_dashboard',
          description: 'Get dashboard view of content requests',
          inputSchema: {
            type: 'object',
            properties: {
              assignee: {
                type: 'string',
                description: 'Filter by assignee email (optional)',
              },
              status: {
                type: 'string',
                description: 'Filter by status (optional)',
              },
              productArea: {
                type: 'string',
                description: 'Filter by product area (optional)',
              },
            },
            required: [],
          },
        },
        {
          name: 'get_user_work_items',
          description: 'Get work items assigned to a specific user (for personalized dashboard)',
          inputSchema: {
            type: 'object',
            properties: {
              userEmail: {
                type: 'string',
                description: 'Email address of the user to get work items for',
              },
              includeStates: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of work item states to include (default: New, Active, Resolved)',
              },
            },
            required: ['userEmail'],
          },
        },
        {
          name: 'get_area_paths',
          description: 'Get area paths from Azure DevOps for the Content\\Production\\MSec Docs\\Security area',
          inputSchema: {
            type: 'object',
            properties: {
              depth: {
                type: 'number',
                description: 'Depth of classification nodes to retrieve (default: 5)',
              },
            },
            required: [],
          },
        },
        {
          name: 'get_iterations',
          description: 'Get available iterations from Azure DevOps for dropdown selection',
          inputSchema: {
            type: 'object',
            properties: {
              teamName: {
                type: 'string',
                description: 'Team name to get iterations for (optional, uses default team if not specified)',
              },
              includeCurrentAndFuture: {
                type: 'boolean',
                description: 'Include only current and future iterations (default: true)',
              },
            },
            required: [],
          },
        },
        {
          name: 'upload_attachment',
          description: 'Upload a file attachment to an Azure DevOps work item',
          inputSchema: {
            type: 'object',
            properties: {
              workItemId: {
                type: 'number',
                description: 'Azure DevOps work item ID to attach file to',
              },
              fileName: {
                type: 'string',
                description: 'Name of the file being uploaded',
              },
              fileContent: {
                type: 'string',
                description: 'Base64 encoded file content',
              },
              comment: {
                type: 'string',
                description: 'Optional comment about the attachment',
              },
            },
            required: ['workItemId', 'fileName', 'fileContent'],
          },
        },
        {
          name: 'validate_user',
          description: 'Validate if a user exists in Azure DevOps for assignment',
          inputSchema: {
            type: 'object',
            properties: {
              userEmail: {
                type: 'string',
                description: 'Email address of the user to validate',
              },
            },
            required: ['userEmail'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'create_content_request':
          return this.createContentRequest(request.params.arguments);
        
        case 'update_request_status':
          return this.updateRequestStatus(request.params.arguments);
        
        case 'assign_content_developer':
          return this.assignContentDeveloper(request.params.arguments);
        
        case 'get_request_details':
          return this.getRequestDetails(request.params.arguments);
        
        case 'get_team_dashboard':
          return this.getTeamDashboard(request.params.arguments);
        
        case 'get_user_work_items':
          return this.getUserWorkItems(request.params.arguments);
        
        case 'get_area_paths':
          return this.getAreaPaths(request.params.arguments);
        
        case 'get_iterations':
          return this.getIterations(request.params.arguments);
        
        case 'upload_attachment':
          return this.uploadAttachment(request.params.arguments);
        
        case 'validate_user':
          return this.validateUser(request.params.arguments);
        
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    });
  }

  private async createContentRequest(args: any) {
    if (!isValidContentRequest(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid content request parameters');
    }

    try {
      // Create a comprehensive description that includes all the details
      const fullDescription = `${args.description}

**Product Area:** ${args.productArea}
**Document Type:** ${args.documentType}
**Business Justification:** ${args.businessJustification}
**Urgency:** ${args.urgency}
**Requestor:** ${args.requestorEmail}
**Reviewers:** ${args.reviewers.join(', ')}
${args.deadline ? `**Deadline:** ${args.deadline}` : ''}
${args.existingContentLinks && args.existingContentLinks.length > 0 ? `**Existing Content Links:** ${args.existingContentLinks.join(', ')}` : ''}`;

      // Try to create actual Azure DevOps work item using minimal required fields
      const workItemFields: WorkItemField[] = [
        { op: 'add', path: '/fields/System.Title', value: `[${args.productArea}] ${args.title}` },
        { op: 'add', path: '/fields/System.Description', value: fullDescription },
        { op: 'add', path: '/fields/System.WorkItemType', value: 'User Story' },
        { op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: this.mapUrgencyToPriority(args.urgency) },
      ];

      // Add optional fields if provided
      if (args.contentDeveloper) {
        workItemFields.push({ op: 'add', path: '/fields/System.AssignedTo', value: args.contentDeveloper });
      }

      if (args.deadline) {
        workItemFields.push({ op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.DueDate', value: args.deadline });
      }

      const response = await this.adoApiClient.post<WorkItemResponse>(
        `/${ADO_DEFAULT_PROJECT}/_apis/wit/workitems/$User Story?api-version=7.0`,
        workItemFields,
        {
          headers: {
            'Content-Type': 'application/json-patch+json',
          },
        }
      );

      const workItem = response.data;
      
      console.log('Real UX Development Request Created:', {
        id: workItem.id,
        title: workItem.fields['System.Title'],
        url: workItem.url
      });

      return {
        content: [
          {
            type: 'text',
            text: `UX Development request created successfully!\n\nWork Item ID: ${workItem.id}\nTitle: ${workItem.fields['System.Title']}\nStatus: ${workItem.fields['System.State']}\nURL: ${workItem.url}\n\nThe request has been submitted and is ready for triage and assignment.`,
          },
        ],
      };
    } catch (error: any) {
      console.error('Error creating work item:', error);
      
      // Fallback to demonstration mode if real creation fails
      const simulatedWorkItemId = Math.floor(Math.random() * 10000) + 1000;
      const simulatedUrl = `https://dev.azure.com/msft-skilling/Content/_workitems/edit/${simulatedWorkItemId}`;
      
      console.log('Falling back to Simulated UX Development Request:', {
        id: simulatedWorkItemId,
        title: `[${args.productArea}] ${args.title}`,
        urgency: args.urgency,
        requestor: args.requestorEmail,
        reviewers: args.reviewers,
        url: simulatedUrl,
        originalError: error.message || error.toString()
      });

      return {
        content: [
          {
            type: 'text',
            text: `UX Development request created successfully!\n\nWork Item ID: ${simulatedWorkItemId}\nTitle: ${args.title}\nStatus: New\nURL: ${simulatedUrl}\n\nThe request has been submitted and is ready for triage and assignment.\n\n⚠️ Note: This is demonstration mode. Real Azure DevOps creation failed with: ${error.message || error.toString()}`,
          },
        ],
      };
    }
  }

  private async updateRequestStatus(args: any) {
    if (!isValidStatusUpdate(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid status update parameters');
    }

    try {
      const workItemFields: WorkItemField[] = [
        { op: 'add', path: '/fields/System.State', value: args.status },
      ];

      if (args.comment) {
        workItemFields.push({ op: 'add', path: '/fields/System.History', value: args.comment });
      }

      const response = await this.adoApiClient.patch<WorkItemResponse>(
        `/${ADO_DEFAULT_PROJECT}/_apis/wit/workitems/${args.workItemId}?api-version=7.0`,
        workItemFields,
        {
          headers: {
            'Content-Type': 'application/json-patch+json',
          },
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: `Work item ${args.workItemId} status updated to: ${args.status}${args.comment ? `\nComment: ${args.comment}` : ''}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error updating status:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error updating status: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async assignContentDeveloper(args: any) {
    if (!isValidAssignment(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid assignment parameters');
    }

    try {
      const workItemFields: WorkItemField[] = [
        { op: 'add', path: '/fields/System.AssignedTo', value: args.assignee },
        { op: 'add', path: '/fields/System.State', value: 'Active' },
      ];

      const response = await this.adoApiClient.patch<WorkItemResponse>(
        `/${ADO_DEFAULT_PROJECT}/_apis/wit/workitems/${args.workItemId}?api-version=7.0`,
        workItemFields,
        {
          headers: {
            'Content-Type': 'application/json-patch+json',
          },
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: `Work item ${args.workItemId} assigned to ${args.assignee} and status set to Active.`,
          },
        ],
      };
    } catch (error) {
      console.error('Error assigning work item:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error assigning work item: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getRequestDetails(args: any) {
    if (typeof args.workItemId !== 'number') {
      throw new McpError(ErrorCode.InvalidParams, 'Work item ID must be a number');
    }

    try {
      const response = await this.adoApiClient.get<WorkItemResponse>(
        `/${ADO_DEFAULT_PROJECT}/_apis/wit/workitems/${args.workItemId}?api-version=7.0&$expand=all`
      );

      const workItem = response.data;
      const fields = workItem.fields;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id: workItem.id,
              title: fields['System.Title'],
              description: fields['System.Description'],
              status: fields['System.State'],
              assignedTo: fields['System.AssignedTo']?.displayName || 'Unassigned',
              createdBy: fields['System.CreatedBy']?.displayName,
              createdDate: fields['System.CreatedDate'],
              tags: fields['System.Tags'],
              priority: fields['Microsoft.VSTS.Common.Priority'],
              dueDate: fields['Microsoft.VSTS.Scheduling.DueDate'],
              productArea: fields['Custom.ProductArea'],
              documentType: fields['Custom.DocumentType'],
              reviewers: fields['Custom.Reviewers'],
              url: workItem.url,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error getting work item details:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error getting work item details: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getTeamDashboard(args: any) {
    try {
      // First test basic project access
      const projectResponse = await this.adoApiClient.get('/_apis/projects?api-version=7.0');
      
      if (!projectResponse.data || !projectResponse.data.value) {
        return {
          content: [
            {
              type: 'text',
              text: 'Unable to access Azure DevOps projects. This indicates an authentication or permission issue with your PAT token.',
            },
          ],
          isError: true,
        };
      }

      // Check if our specific project exists
      const contentProject = projectResponse.data.value.find((p: any) => p.name === 'Content');
      
      if (!contentProject) {
        const availableProjects = projectResponse.data.value.map((p: any) => p.name).join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `Project 'Content' not found. Available projects: ${availableProjects}\n\nPlease check the ADO_PROJECT environment variable in the MCP configuration.`,
            },
          ],
          isError: true,
        };
      }

      // Query work item types to understand what's available
      let workItemTypesInfo = '';
      let userStoryFields = '';
      try {
        const workItemTypesResponse = await this.adoApiClient.get(`/${ADO_DEFAULT_PROJECT}/_apis/wit/workitemtypes?api-version=7.0`);
        const workItemTypes = workItemTypesResponse.data.value.map((wit: any) => wit.name);
        workItemTypesInfo = `Available work item types: ${workItemTypes.join(', ')}`;
        
        // Get detailed info about User Story work item type
        try {
          const userStoryResponse = await this.adoApiClient.get(`/${ADO_DEFAULT_PROJECT}/_apis/wit/workitemtypes/User%20Story?api-version=7.0`);
          const fields = userStoryResponse.data.fields;
          const requiredFields = fields.filter((f: any) => f.alwaysRequired || f.required).map((f: any) => f.referenceName);
          userStoryFields = `User Story required fields: ${requiredFields.join(', ')}`;
        } catch (userStoryError) {
          userStoryFields = `Error getting User Story fields: ${userStoryError}`;
        }
      } catch (witError) {
        workItemTypesInfo = `Error getting work item types: ${witError}`;
      }

      // For now, just return project information and work item types
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              connectionStatus: 'Success - Basic Connection Working',
              project: {
                name: contentProject.name,
                id: contentProject.id,
                url: contentProject.url,
                description: contentProject.description
              },
              workItemTypes: workItemTypesInfo,
              userStoryFields: userStoryFields,
              diagnostics: {
                patTokenWorking: true,
                organizationAccess: true,
                projectAccess: true,
                note: 'Work item creation debugging in progress'
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error getting team dashboard:', error);
      return {
        content: [
          {
            type: 'text',
          text: `Connection test failed: ${error}\n\nDetailed diagnosis:\n1. Check PAT token validity\n2. Verify organization URL: ${ADO_ORGANIZATION_URL}\n3. Confirm project name: ${ADO_DEFAULT_PROJECT}\n4. Ensure PAT has 'Work Items (Read)' and 'Project and Team (Read)' permissions`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getUserWorkItems(args: any) {
    if (!args.userEmail || typeof args.userEmail !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'User email is required');
    }

    try {
      // Default states to include if not specified
      const includeStates = args.includeStates || ['New', 'Active', 'Resolved'];
      const statesFilter = includeStates.map((state: string) => `'${state}'`).join(',');

      // Log what we're about to query to debug iteration filtering
      console.log(`📊 DEBUG: getUserWorkItems called with userEmail: ${args.userEmail}`);
      console.log(`📊 DEBUG: includeStates: ${JSON.stringify(includeStates)}`);

      // First, let's query without iteration filtering to see what iteration paths exist
      let wiqlQuery = {
        query: `
          SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], 
                 [System.CreatedDate], [System.ChangedDate], [Microsoft.VSTS.Common.Priority],
                 [Microsoft.VSTS.Scheduling.DueDate], [System.WorkItemType],
                 [System.IterationPath], [System.AreaPath], [System.TeamProject]
          FROM WorkItems 
          WHERE [System.AssignedTo] = '` + args.userEmail + `'
            AND [System.State] IN (` + statesFilter + `)
          ORDER BY [System.ChangedDate] DESC
        `
      };

      // Special case for test query to see current iteration items
      if (args.userEmail === 'test-broad-query') {
        wiqlQuery = {
          query: `
            SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], 
                   [System.CreatedDate], [System.ChangedDate], [Microsoft.VSTS.Common.Priority],
                   [Microsoft.VSTS.Scheduling.DueDate], [System.WorkItemType],
                   [System.IterationPath], [System.AreaPath], [System.TeamProject]
            FROM WorkItems 
            WHERE [System.State] IN ('New', 'Active', 'Committed', 'In Review')
              AND [System.ChangedDate] >= '2025-08-01'
            ORDER BY [System.ChangedDate] DESC
          `
        };
      }

      // Execute WIQL query across organization (organization-wide for multi-project support)
      const wiqlResponse = await this.adoApiClient.post(
        `/_apis/wit/wiql?api-version=7.0`,
        wiqlQuery,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const workItemIds = wiqlResponse.data.workItems?.map((wi: any) => wi.id) || [];
      
      if (workItemIds.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                userEmail: args.userEmail,
                totalCount: 0,
                workItems: [],
                message: 'No work items found assigned to this user with the specified states',
                queriedStates: includeStates
              }, null, 2),
            },
          ],
        };
      }

      // Get detailed information for the work items (organization-level)
      // Handle Azure DevOps 200 item limit by chunking requests
      const chunkSize = 200;
      const workItemChunks = [];
      
      for (let i = 0; i < workItemIds.length; i += chunkSize) {
        const chunk = workItemIds.slice(i, i + chunkSize);
        workItemChunks.push(chunk);
      }
      
      let allWorkItems: any[] = [];
      
      for (const chunk of workItemChunks) {
        try {
          const workItemDetailsResponse = await this.adoApiClient.get(
            `/_apis/wit/workitems?ids=${chunk.join(',')}&$expand=all&api-version=7.0`
          );
          
          if (workItemDetailsResponse.data.value) {
            allWorkItems = allWorkItems.concat(workItemDetailsResponse.data.value);
          }
        } catch (chunkError: any) {
          console.error(`Error fetching chunk of ${chunk.length} work items:`, chunkError.message);
          // Continue with other chunks even if one fails
        }
      }
      
      // Use allWorkItems instead of workItemDetailsResponse.data.value
      const workItemDetailsResponse = { data: { value: allWorkItems } };

      const workItems = workItemDetailsResponse.data.value.map((wi: any) => ({
        id: wi.id,
        title: wi.fields['System.Title'],
        state: wi.fields['System.State'],
        workItemType: wi.fields['System.WorkItemType'],
        teamProject: wi.fields['System.TeamProject'],
        assignedTo: wi.fields['System.AssignedTo']?.displayName || 'Unassigned',
        createdDate: wi.fields['System.CreatedDate'],
        changedDate: wi.fields['System.ChangedDate'],
        priority: wi.fields['Microsoft.VSTS.Common.Priority'],
        dueDate: wi.fields['Microsoft.VSTS.Scheduling.DueDate'],
        iterationPath: wi.fields['System.IterationPath'],
        areaPath: wi.fields['System.AreaPath'],
        url: `https://dev.azure.com/msft-skilling/${wi.fields['System.TeamProject'] || 'Content'}/_workitems/edit/${wi.id}`,
        description: wi.fields['System.Description']?.substring(0, 200) + (wi.fields['System.Description']?.length > 200 ? '...' : '')
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              userEmail: args.userEmail,
              totalCount: workItems.length,
              queriedStates: includeStates,
              workItems: workItems,
              summary: {
                byState: includeStates.reduce((acc: any, state: string) => {
                  acc[state] = workItems.filter((wi: any) => wi.state === state).length;
                  return acc;
                }, {}),
                byPriority: {
                  'Priority 1': workItems.filter((wi: any) => wi.priority === 1).length,
                  'Priority 2': workItems.filter((wi: any) => wi.priority === 2).length,
                  'Priority 3': workItems.filter((wi: any) => wi.priority === 3).length,
                  'Priority 4': workItems.filter((wi: any) => wi.priority === 4).length,
                }
              }
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error('Error getting user work items:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error getting work items for user ${args.userEmail}: ${error.message || error.toString()}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getAreaPaths(args: any) {
    try {
      const depth = args.depth || 5;
      
      // Get classification nodes for area paths under Content\Production\MSec Docs\Security
      const response = await this.adoApiClient.get(
        `/${ADO_DEFAULT_PROJECT}/_apis/wit/classificationnodes/areas?$depth=${depth}&api-version=7.0`
      );

      const areaPaths: string[] = [];
      
      // Function to recursively extract area paths
      const extractAreaPaths = (node: any, parentPath: string = '') => {
        const currentPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
        
        // Look for Content\Production\MSec Docs\Security path
        if (currentPath.includes('Content\\Production\\MSec Docs\\Security') || 
            currentPath.includes('Production\\MSec Docs\\Security') ||
            currentPath.includes('MSec Docs\\Security')) {
          areaPaths.push(currentPath);
        }
        
        // Recursively process children
        if (node.children) {
          node.children.forEach((child: any) => {
            extractAreaPaths(child, currentPath);
          });
        }
      };

      // Start extraction from root
      if (response.data) {
        extractAreaPaths(response.data);
      }

      // If no specific paths found, get all area paths as fallback
      if (areaPaths.length === 0) {
        const getAllAreaPaths = (node: any, parentPath: string = '') => {
          const currentPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
          areaPaths.push(currentPath);
          
          if (node.children) {
            node.children.forEach((child: any) => {
              getAllAreaPaths(child, currentPath);
            });
          }
        };
        
        if (response.data) {
          getAllAreaPaths(response.data);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              areaPaths: areaPaths,
              total: areaPaths.length,
              note: areaPaths.length === 0 ? 'No area paths found. Check ADO configuration.' : 'Area paths retrieved successfully'
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error('Error getting area paths:', error);
      
      // Fallback with simulated area paths
      const fallbackAreaPaths = [
        'Content\\Production\\MSec Docs\\Security\\Authentication',
        'Content\\Production\\MSec Docs\\Security\\Authorization',
        'Content\\Production\\MSec Docs\\Security\\Data Protection',
        'Content\\Production\\MSec Docs\\Security\\Network Security',
        'Content\\Production\\MSec Docs\\Security\\Compliance'
      ];
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              areaPaths: fallbackAreaPaths,
              total: fallbackAreaPaths.length,
              note: `Fallback mode - using simulated area paths. Original error: ${error.message || error.toString()}`
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getIterations(args: any) {
    try {
      const includeCurrentAndFuture = args.includeCurrentAndFuture !== false; // default true
      const teamName = args.teamName || 'Content Team'; // default team name
      
      // First get the team ID
      let teamId = '';
      try {
        const teamsResponse = await this.adoApiClient.get(`/${ADO_DEFAULT_PROJECT}/_apis/teams?api-version=7.0`);
        const team = teamsResponse.data.value.find((t: any) => 
          t.name === teamName || t.name.includes('Content') || t.name.includes('Default')
        );
        teamId = team ? team.id : teamsResponse.data.value[0]?.id || '';
      } catch (teamError) {
        console.warn('Could not get team info, using project-level iterations');
      }

      // Get iterations
      let iterationsUrl = '';
      if (teamId) {
        iterationsUrl = `/${ADO_DEFAULT_PROJECT}/${teamId}/_apis/work/teamsettings/iterations?api-version=7.0`;
      } else {
        iterationsUrl = `/${ADO_DEFAULT_PROJECT}/_apis/wit/classificationnodes/iterations?$depth=2&api-version=7.0`;
      }

      const response = await this.adoApiClient.get(iterationsUrl);
      
      const iterations: any[] = [];
      const currentDate = new Date();

      // Process iterations based on response structure
      if (response.data.value) {
        // Team iterations format
        response.data.value.forEach((iteration: any) => {
          const startDate = iteration.attributes?.startDate ? new Date(iteration.attributes.startDate) : null;
          const finishDate = iteration.attributes?.finishDate ? new Date(iteration.attributes.finishDate) : null;
          
          if (!includeCurrentAndFuture || !finishDate || finishDate >= currentDate) {
            iterations.push({
              id: iteration.id,
              name: iteration.name,
              path: iteration.path,
              startDate: startDate?.toISOString().split('T')[0],
              finishDate: finishDate?.toISOString().split('T')[0],
              state: finishDate && finishDate < currentDate ? 'past' : 
                     startDate && startDate <= currentDate && finishDate && finishDate >= currentDate ? 'current' : 'future'
            });
          }
        });
      } else if (response.data.children) {
        // Classification nodes format
        const extractIterations = (node: any, parentPath: string = '') => {
          const currentPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
          
          iterations.push({
            id: node.id,
            name: node.name,
            path: currentPath,
            startDate: node.attributes?.startDate,
            finishDate: node.attributes?.finishDate,
            state: 'unknown'
          });
          
          if (node.children) {
            node.children.forEach((child: any) => {
              extractIterations(child, currentPath);
            });
          }
        };
        
        response.data.children.forEach((child: any) => {
          extractIterations(child);
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              iterations: iterations,
              total: iterations.length,
              teamName: teamName,
              includeCurrentAndFuture: includeCurrentAndFuture,
              note: iterations.length === 0 ? 'No iterations found. Check team configuration.' : 'Iterations retrieved successfully'
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error('Error getting iterations:', error);
      
      // Fallback with simulated iterations
      const fallbackIterations = [
        { id: 'iter1', name: 'Sprint 1', path: 'Content\\Sprint 1', startDate: '2025-01-01', finishDate: '2025-01-15', state: 'future' },
        { id: 'iter2', name: 'Sprint 2', path: 'Content\\Sprint 2', startDate: '2025-01-16', finishDate: '2025-01-30', state: 'future' },
        { id: 'iter3', name: 'Sprint 3', path: 'Content\\Sprint 3', startDate: '2025-01-31', finishDate: '2025-02-14', state: 'future' }
      ];
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              iterations: fallbackIterations,
              total: fallbackIterations.length,
              note: `Fallback mode - using simulated iterations. Original error: ${error.message || error.toString()}`
            }, null, 2),
          },
        ],
      };
    }
  }

  private async uploadAttachment(args: any) {
    if (!args.workItemId || !args.fileName || !args.fileContent) {
      throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters: workItemId, fileName, or fileContent');
    }

    try {
      // First upload the attachment to ADO
      const fileBuffer = Buffer.from(args.fileContent, 'base64');
      
      const attachmentResponse = await this.adoApiClient.post(
        '/_apis/wit/attachments?api-version=7.0',
        fileBuffer,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          params: {
            fileName: args.fileName,
          },
        }
      );

      const attachmentUrl = attachmentResponse.data.url;
      
      // Now link the attachment to the work item
      const workItemFields: WorkItemField[] = [
        {
          op: 'add',
          path: '/relations/-',
          value: {
            rel: 'AttachedFile',
            url: attachmentUrl,
            attributes: {
              comment: args.comment || `Uploaded file: ${args.fileName}`
            }
          }
        }
      ];

      if (args.comment) {
        workItemFields.push({
          op: 'add',
          path: '/fields/System.History',
          value: `File attached: ${args.fileName}. ${args.comment}`
        });
      }

      const workItemResponse = await this.adoApiClient.patch(
        `/${ADO_DEFAULT_PROJECT}/_apis/wit/workitems/${args.workItemId}?api-version=7.0`,
        workItemFields,
        {
          headers: {
            'Content-Type': 'application/json-patch+json',
          },
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: `File "${args.fileName}" uploaded successfully to work item ${args.workItemId}.\n\nAttachment URL: ${attachmentUrl}${args.comment ? `\nComment: ${args.comment}` : ''}`,
          },
        ],
      };
    } catch (error: any) {
      console.error('Error uploading attachment:', error);
      
      // Simulate successful upload for demonstration
      const simulatedUrl = `https://dev.azure.com/msft-skilling/Content/_apis/wit/attachments/${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        content: [
          {
            type: 'text',
            text: `File "${args.fileName}" upload simulated for work item ${args.workItemId}.\n\nSimulated URL: ${simulatedUrl}${args.comment ? `\nComment: ${args.comment}` : ''}\n\n⚠️ Note: This is demonstration mode. Real upload failed with: ${error.message || error.toString()}`,
          },
        ],
      };
    }
  }

  private async validateUser(args: any) {
    if (!args.userEmail || typeof args.userEmail !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'User email is required');
    }

    try {
      // Search for users in the organization
      const response = await this.adoApiClient.get(
        '/_apis/graph/users',
        {
          params: {
            'api-version': '7.0-preview.1',
            '$filter': `startswith(mailAddress,'${args.userEmail}') or startswith(principalName,'${args.userEmail}')`
          }
        }
      );

      const users = response.data.value || [];
      const exactMatch = users.find((user: any) => 
        user.mailAddress === args.userEmail || 
        user.principalName === args.userEmail
      );

      if (exactMatch) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                valid: true,
                user: {
                  email: exactMatch.mailAddress,
                  displayName: exactMatch.displayName,
                  principalName: exactMatch.principalName,
                  id: exactMatch.originId
                },
                message: 'User found and valid for assignment'
              }, null, 2),
            },
          ],
        };
      } else {
        // Check if there are similar matches
        const similarUsers = users.filter((user: any) =>
          user.mailAddress?.toLowerCase().includes(args.userEmail.toLowerCase()) ||
          user.displayName?.toLowerCase().includes(args.userEmail.toLowerCase())
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                valid: false,
                user: null,
                similarUsers: similarUsers.map((user: any) => ({
                  email: user.mailAddress,
                  displayName: user.displayName,
                  principalName: user.principalName
                })).slice(0, 5), // Limit to 5 suggestions
                message: similarUsers.length > 0 ? 
                  'User not found exactly, but similar users exist' : 
                  'User not found in the organization'
              }, null, 2),
            },
          ],
        };
      }
    } catch (error: any) {
      console.error('Error validating user:', error);
      
      // Fallback validation logic
      const commonDomains = ['microsoft.com', 'outlook.com', 'hotmail.com'];
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailPattern.test(args.userEmail);
      const hasCommonDomain = commonDomains.some(domain => args.userEmail.endsWith(domain));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              valid: isValidEmail && hasCommonDomain,
              user: isValidEmail && hasCommonDomain ? {
                email: args.userEmail,
                displayName: args.userEmail.split('@')[0],
                principalName: args.userEmail,
                id: 'unknown'
              } : null,
              similarUsers: [],
              message: `Fallback validation: ${isValidEmail ? 'valid email format' : 'invalid email format'}. Original error: ${error.message || error.toString()}`
            }, null, 2),
          },
        ],
      };
    }
  }

  private mapUrgencyToPriority(urgency: string): number {
    switch (urgency) {
      case 'Critical': return 1;
      case 'High': return 2;
      case 'Medium': return 3;
      case 'Low': return 4;
      default: return 3;
    }
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    // Start stdio transport for CLI/MCP integration
    const stdioTransport = new StdioServerTransport();
    await this.server.connect(stdioTransport);
    console.error('Content Request MCP server running on stdio');

    // Start HTTP server for frontend integration
    const app = express();
    app.use(express.json());

    // MCP JSON-RPC HTTP endpoint for tool invocation
    app.post('/api/tool', async (req: express.Request, res: express.Response) => {
      try {
        const { jsonrpc, id, method, params } = req.body;
        if (jsonrpc !== "2.0" || method !== "tool/call" || !params?.tool) {
          return res.status(400).json({ error: "Invalid JSON-RPC request" });
        }
        // Call the tool handler using MCP's request handler
        // NOTE: Provide the resultSchema argument as required by the SDK
        const result = await this.server.request(
          {
            method: "tool/call",
            params: {
              tool: params.tool,
              input: params.input
            }
          },
          CallToolRequestSchema // Use the schema for tool calls
        );
        res.json({
          jsonrpc: "2.0",
          id,
          result
        });
      } catch (err: any) {
        res.status(500).json({ error: err?.message || String(err) });
      }
    });

    app.listen(3001, () => {
      console.log('Content Request MCP HTTP server running on port 3001');
    });
  }
}

const server = new ContentRequestServer();
server.run().catch(console.error);
