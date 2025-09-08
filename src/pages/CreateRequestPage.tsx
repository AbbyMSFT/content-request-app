import React, { useState, useEffect } from 'react';
import { FileText, Upload, Calendar, AlertCircle, CheckCircle, User, RefreshCw } from 'lucide-react';

interface FormData {
  productArea: string;
  title: string;
  description: string;
  iteration: string;
  requestorEmail: string;
  contentDeveloper: string;
  reviewers: string[];
  existingContentLinks: string[];
}

interface AreaPath {
  path: string;
}

interface Iteration {
  id: string;
  name: string;
  path: string;
  startDate?: string;
  finishDate?: string;
  state?: string;
}

interface WorkItemResult {
  workItemId: number;
  title: string;
  url: string;
  status: string;
}

const CreateRequestPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    productArea: '',
    title: '',
    description: '',
    iteration: '',
    requestorEmail: '',
    contentDeveloper: '',
    reviewers: [''],
    existingContentLinks: ['']
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // New state for dynamic ADO data
  const [areaPaths, setAreaPaths] = useState<AreaPath[]>([]);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [createdWorkItem, setCreatedWorkItem] = useState<WorkItemResult | null>(null);

  const productAreas = [
    'Azure Active Directory',
    'Azure Security Center',
    'Power BI',
    'Azure SDK',
    'Microsoft Graph',
    'Azure DevOps',
    'Office 365',
    'Microsoft Teams',
    'SharePoint',
    'Exchange Online'
  ];



  // Load ADO data on component mount
  useEffect(() => {
    const loadADOData = async () => {
      setIsLoadingData(true);
      setDataLoadError(null);

      try {
        // Load area paths
        try {
          console.log('🔄 Frontend: Loading area paths...');
          const response = await fetch('/api/mcp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              server_name: 'content-request-server',
              tool_name: 'get_area_paths',
              arguments: {
                depth: 5
              }
            })
          });

          console.log('📡 Frontend: Area paths response status:', response.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('📂 Frontend: Area paths result:', result);
            
            if (result.success && result.data.areaPaths) {
              console.log('✅ Frontend: Successfully loaded', result.data.areaPaths.length, 'area paths');
              setAreaPaths(result.data.areaPaths);
            } else {
              console.warn('⚠️ Frontend: Area paths call was not successful:', result.error);
            }
          } else {
            console.error('❌ Frontend: Area paths API call failed with status:', response.status);
          }
        } catch (error) {
          console.error('❌ Frontend: Failed to load area paths:', error);
        }

        // Load iterations
        try {
          console.log('🔄 Frontend: Loading iterations...');
          const response = await fetch('/api/mcp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              server_name: 'content-request-server',
              tool_name: 'get_iterations',
              arguments: {
                includeCurrentAndFuture: true
              }
            })
          });

          console.log('📡 Frontend: Iterations response status:', response.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('📅 Frontend: Iterations result:', result);
            
            if (result.success && result.data.iterations) {
              console.log('✅ Frontend: Successfully loaded', result.data.iterations.length, 'iterations');
              setIterations(result.data.iterations);
            } else {
              console.warn('⚠️ Frontend: Iterations call was not successful:', result.error);
            }
          } else {
            console.error('❌ Frontend: Iterations API call failed with status:', response.status);
          }
        } catch (error) {
          console.error('❌ Frontend: Failed to load iterations:', error);
        }

      } catch (error) {
        console.error('Error loading ADO data:', error);
        setDataLoadError('Failed to load form data from Azure DevOps. Some fields may not be available.');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadADOData();
  }, []);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayChange = (field: 'reviewers' | 'existingContentLinks', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: 'reviewers' | 'existingContentLinks') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'reviewers' | 'existingContentLinks', index: number) => {
    if (formData[field].length > 1) {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Validate assigned developer if provided
      let validatedAssignedTo = '';
      if (formData.contentDeveloper.trim()) {
        try {
          const userValidationResponse = await fetch('/api/mcp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              server_name: 'content-request-server',
              tool_name: 'validate_user',
              arguments: {
                userEmail: formData.contentDeveloper.trim()
              }
            })
          });

          if (userValidationResponse.ok) {
            const result = await userValidationResponse.json();
            if (result.success && result.data.isValid) {
              validatedAssignedTo = formData.contentDeveloper.trim();
            }
          }
        } catch (error) {
          console.warn('User validation failed, proceeding without assignment:', error);
        }
      }

      // Create work item
      const workItemResponse = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server_name: 'content-request-server',
          tool_name: 'create_content_request',
          arguments: {
            title: formData.title,
            description: formData.description,
            areaPath: formData.productArea,
            iterationPath: formData.iteration,
            priority: 3, // Default to medium priority
            requestorEmail: formData.requestorEmail,
            assignedTo: validatedAssignedTo,
            reviewers: formData.reviewers.filter(r => r.trim() !== ''),
            relatedLinks: formData.existingContentLinks.filter(l => l.trim() !== '')
          }
        })
      });

      if (!workItemResponse.ok) {
        throw new Error('Failed to create work item');
      }

      const workItemResult = await workItemResponse.json();
      if (!workItemResult.success) {
        throw new Error(workItemResult.error || 'Failed to create work item');
      }

      setCreatedWorkItem(workItemResult.data);

      // Upload attachments if any
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          try {
            const reader = new FileReader();
            const fileContent = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            });

            const base64Content = fileContent.split(',')[1];

            await fetch('/api/mcp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                server_name: 'content-request-server',
                tool_name: 'upload_attachment',
                arguments: {
                  workItemId: workItemResult.data.workItemId,
                  fileName: file.name,
                  fileContent: base64Content,
                  comment: `Attachment uploaded for content request: ${formData.title}`
                }
              })
            });
          } catch (error) {
            console.warn(`Failed to upload attachment ${file.name}:`, error);
          }
        }
      }
      
      setSubmitStatus('success');
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          productArea: '',
          title: '',
          description: '',
          iteration: '',
          requestorEmail: '',
          contentDeveloper: '',
          reviewers: [''],
          existingContentLinks: ['']
        });
        setUploadedFiles([]);
        setCreatedWorkItem(null);
        setSubmitStatus('idle');
      }, 5000);
      
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return formData.productArea && 
           formData.title && 
           formData.description && 
           formData.requestorEmail &&
           formData.reviewers.some(reviewer => reviewer.trim() !== '');
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-lg">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Your content request has been created in Azure DevOps and will be reviewed by our team.
          </p>
          
          {createdWorkItem && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Work Item Details</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Work Item ID:</strong> {createdWorkItem.workItemId}</p>
                <p><strong>Title:</strong> {createdWorkItem.title}</p>
                <p><strong>Status:</strong> {createdWorkItem.status}</p>
              </div>
              {createdWorkItem.url && (
                <div className="mt-3">
                  <a
                    href={createdWorkItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View in Azure DevOps
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}
          
          <p className="text-sm text-gray-500">
            You will receive notifications as the request progresses through the review and development process.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create UX Development Request</h1>
          <p className="mt-2 text-gray-600">Submit a new request for UX development or updates</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Basic Information
              </h3>
            </div>
            <div className="px-6 py-4 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Area <span className="text-red-500">*</span>
                  {isLoadingData && (
                    <RefreshCw className="w-4 h-4 inline-block ml-2 animate-spin text-gray-400" />
                  )}
                </label>
                <select
                  value={formData.productArea}
                  onChange={(e) => handleInputChange('productArea', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isLoadingData}
                >
                  <option value="">
                    {isLoadingData ? 'Loading areas...' : 'Select a product area'}
                  </option>
                  {areaPaths.length > 0 ? (
                    areaPaths.map(area => (
                      <option key={area.path} value={area.path}>{area.path}</option>
                    ))
                  ) : (
                    !isLoadingData && productAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))
                  )}
                </select>
                {dataLoadError && areaPaths.length === 0 && !isLoadingData && (
                  <p className="text-sm text-amber-600 mt-1">
                    Using fallback areas. Azure DevOps integration may be unavailable.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief, descriptive title for the content request"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detailed description of what content is needed, including scope, audience, and specific requirements"
                  required
                />
              </div>


            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Timeline
              </h3>
            </div>
            <div className="px-6 py-4 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target date <span className="text-red-500">*</span>
                  {isLoadingData && (
                    <RefreshCw className="w-4 h-4 inline-block ml-2 animate-spin text-gray-400" />
                  )}
                </label>
                <select
                  value={formData.iteration}
                  onChange={(e) => handleInputChange('iteration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isLoadingData}
                >
                  <option value="">
                    {isLoadingData ? 'Loading target dates...' : 'Select a target date'}
                  </option>
                  {iterations.map(iteration => (
                    <option key={iteration.id} value={iteration.id}>
                      {iteration.name}
                      {iteration.startDate && iteration.finishDate && (
                        ` (${new Date(iteration.startDate).toLocaleDateString()} - ${new Date(iteration.finishDate).toLocaleDateString()})`
                      )}
                    </option>
                  ))}
                </select>
                {iterations.length === 0 && !isLoadingData && (
                  <p className="text-sm text-amber-600 mt-1">
                    No target dates available. Check Azure DevOps connection.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* People and Assignments */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2" />
                People and Assignments
              </h3>
            </div>
            <div className="px-6 py-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.requestorEmail}
                    onChange={(e) => handleInputChange('requestorEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your.email@microsoft.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Content Developer
                  </label>
                  <input
                    type="email"
                    value={formData.contentDeveloper}
                    onChange={(e) => handleInputChange('contentDeveloper', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="developer.email@microsoft.com (optional)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reviewers <span className="text-red-500">*</span>
                </label>
                {formData.reviewers.map((reviewer, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="email"
                      value={reviewer}
                      onChange={(e) => handleArrayChange('reviewers', index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="reviewer.email@microsoft.com"
                      required={index === 0}
                    />
                    {formData.reviewers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('reviewers', index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('reviewers')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Another Reviewer
                </button>
              </div>
            </div>
          </div>

          {/* Supporting Materials */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Supporting Materials
              </h3>
            </div>
            <div className="px-6 py-4 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Uploads
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Upload files</span>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, PDF, DOCX up to 10MB each
                    </p>
                  </div>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</h4>
                    <ul className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <li key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Existing Content Links
                </label>
                {formData.existingContentLinks.map((link, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => handleArrayChange('existingContentLinks', index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://docs.microsoft.com/..."
                    />
                    {formData.existingContentLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('existingContentLinks', index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('existingContentLinks')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Another Link
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid() || isSubmitting}
              className={`px-6 py-2 rounded-md text-white font-medium ${
                isFormValid() && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>

          {submitStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-red-800">
                  There was an error submitting your request. Please try again.
                </p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateRequestPage;
