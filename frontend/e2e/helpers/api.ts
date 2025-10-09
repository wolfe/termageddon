import { Page } from '@playwright/test';
import { TEST_TERMS, TEST_DEFINITIONS, TEST_DOMAINS } from '../fixtures/testData';

export interface CreatedResource {
  type: 'term' | 'version' | 'entry';
  id: string;
  name?: string;
}

export class ApiHelper {
  private createdResources: CreatedResource[] = [];
  
  constructor(private page: Page) {}

  /**
   * Get authentication token from localStorage
   */
  private async getAuthToken(): Promise<string> {
    const token = await this.page.evaluate(() => {
      return localStorage.getItem('auth_token');
    });
    if (!token) {
      throw new Error('No authentication token found in localStorage');
    }
    return token;
  }

  /**
   * Track a created resource for cleanup
   */
  private trackResource(resource: CreatedResource) {
    this.createdResources.push(resource);
  }

  /**
   * Setup test data via API calls
   */
  async setupTestData() {
    // This would make API calls to set up test data
    // For now, we'll use the existing test data that should be loaded
    console.log('Setting up test data...');
  }

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    // This would clean up test data after tests
    console.log('Cleaning up test data...');
  }

  /**
   * Clean up all tracked resources
   */
  async cleanupResources(resourceIds?: string[]) {
    const resourcesToCleanup = resourceIds 
      ? this.createdResources.filter(r => resourceIds.includes(r.id))
      : this.createdResources;

    for (const resource of resourcesToCleanup) {
      try {
        await this.deleteResource(resource);
      } catch (error) {
        console.warn(`Failed to cleanup resource ${resource.type}:${resource.id}:`, error);
      }
    }

    // Remove cleaned resources from tracking
    if (resourceIds) {
      this.createdResources = this.createdResources.filter(r => !resourceIds.includes(r.id));
    } else {
      this.createdResources = [];
    }
  }

  /**
   * Delete a specific resource
   */
  private async deleteResource(resource: CreatedResource) {
    switch (resource.type) {
      case 'version':
        await this.deleteVersion(resource.id);
        break;
      case 'entry':
        await this.deleteEntry(resource.id);
        break;
      case 'term':
        await this.deleteTerm(resource.id);
        break;
    }
  }

  /**
   * Get all tracked resources
   */
  getTrackedResources(): CreatedResource[] {
    return [...this.createdResources];
  }

  /**
   * Clear resource tracking without cleanup
   */
  clearResourceTracking() {
    this.createdResources = [];
  }

  /**
   * Create a test term via API
   */
  async createTerm(termName: string, domain: string, definition?: string) {
    // Ensure we're authenticated by checking if we can access a protected endpoint
    const authToken = await this.getAuthToken();
    const authCheck = await this.page.request.get('/api/auth/me/', {
      headers: {
        'Authorization': `Token ${authToken}`
      }
    });
    if (!authCheck.ok()) {
      console.log(`Auth check failed: ${authCheck.status()} - ${await authCheck.text()}`);
      throw new Error('Not authenticated - cannot create entries via API');
    }
    
    console.log(`Creating entry with term: ${termName} in domain: ${domain}`);
    
    // First, get the domain ID using the authenticated page context
    const domainResponse = await this.page.request.get('/api/domains/', {
      headers: {
        'Authorization': `Token ${await this.getAuthToken()}`
      }
    });
    if (!domainResponse.ok()) {
      throw new Error(`Failed to get domains: ${domainResponse.status()}`);
    }
    const domains = await domainResponse.json();
    const domainObj = domains.find((d: any) => d.name === domain);
    if (!domainObj) {
      throw new Error(`Domain '${domain}' not found`);
    }
    
    const response = await this.page.request.post('/api/entries/create_with_term/', {
      data: {
        term_text: termName,
        domain_id: domainObj.id,
        is_official: false
      },
      headers: {
        'Authorization': `Token ${authToken}`
      }
    });
    
    if (!response.ok()) {
      const errorText = await response.text();
      console.log(`Failed to create entry: ${response.status()} - ${errorText}`);
      throw new Error(`Failed to create entry: ${response.status()}`);
    }
    
    const result = await response.json();
    
    // Track the created term for cleanup
    this.trackResource({
      type: 'term',
      id: result.term?.id || result.id,
      name: termName
    });
    
    return result;
  }

  /**
   * Delete a term via API
   */
  async deleteTerm(termId: string) {
    const response = await this.page.request.delete(`/api/terms/${termId}/`);
    
    if (!response.ok()) {
      throw new Error(`Failed to delete term: ${response.status()}`);
    }
  }

  /**
   * Create a test definition version via API
   */
  async createDefinitionVersion(termId: string, content: string) {
    const response = await this.page.request.post(`/api/terms/${termId}/versions/`, {
      data: {
        content: content
      }
    });
    
    if (!response.ok()) {
      throw new Error(`Failed to create definition version: ${response.status()}`);
    }
    
    const result = await response.json();
    
    // Track the created version for cleanup
    this.trackResource({
      type: 'version',
      id: result.id,
      name: `version for term ${termId}`
    });
    
    return result;
  }

  /**
   * Delete a version via API
   */
  async deleteVersion(versionId: string) {
    const response = await this.page.request.delete(`/api/versions/${versionId}/`);
    
    if (!response.ok()) {
      throw new Error(`Failed to delete version: ${response.status()}`);
    }
  }

  /**
   * Delete an entry via API
   */
  async deleteEntry(entryId: string) {
    const response = await this.page.request.delete(`/api/entries/${entryId}/`);
    
    if (!response.ok()) {
      throw new Error(`Failed to delete entry: ${response.status()}`);
    }
  }

  /**
   * Approve a definition version via API
   */
  async approveVersion(versionId: string) {
    const response = await this.page.request.post(`/api/versions/${versionId}/approve/`);
    
    if (!response.ok()) {
      throw new Error(`Failed to approve version: ${response.status()}`);
    }
    
    return response.json();
  }

  /**
   * Publish a definition version via API
   */
  async publishVersion(versionId: string) {
    const response = await this.page.request.post(`/api/versions/${versionId}/publish/`);
    
    if (!response.ok()) {
      throw new Error(`Failed to publish version: ${response.status()}`);
    }
    
    return response.json();
  }

  /**
   * Endorse a definition version via API
   */
  async endorseVersion(versionId: string) {
    const response = await this.page.request.post(`/api/versions/${versionId}/endorse/`);
    
    if (!response.ok()) {
      throw new Error(`Failed to endorse version: ${response.status()}`);
    }
    
    return response.json();
  }

  /**
   * Get term details via API
   */
  async getTerm(termId: string) {
    const response = await this.page.request.get(`/api/terms/${termId}/`);
    
    if (!response.ok()) {
      throw new Error(`Failed to get term: ${response.status()}`);
    }
    
    return response.json();
  }

  /**
   * Get all terms via API
   */
  async getAllTerms() {
    const response = await this.page.request.get('/api/terms/');
    
    if (!response.ok()) {
      throw new Error(`Failed to get terms: ${response.status()}`);
    }
    
    return response.json();
  }

  /**
   * Get pending versions via API
   */
  async getPendingVersions() {
    const response = await this.page.request.get('/api/versions/pending/');
    
    if (!response.ok()) {
      throw new Error(`Failed to get pending versions: ${response.status()}`);
    }
    
    return response.json();
  }

  /**
   * Search terms via API
   */
  async searchTerms(query: string, domain?: string) {
    const params = new URLSearchParams({ search: query });
    if (domain) {
      params.append('domain', domain);
    }
    
    const response = await this.page.request.get(`/api/terms/?${params.toString()}`);
    
    if (!response.ok()) {
      throw new Error(`Failed to search terms: ${response.status()}`);
    }
    
    return response.json();
  }

  /**
   * Get user permissions via API
   */
  async getUserPermissions() {
    const response = await this.page.request.get('/api/user/permissions/');
    
    if (!response.ok()) {
      throw new Error(`Failed to get user permissions: ${response.status()}`);
    }
    
    return response.json();
  }

  /**
   * Mock API responses for testing
   */
  async mockApiResponse(url: string, response: any) {
    await this.page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Mock API error responses
   */
  async mockApiError(url: string, status: number, message: string) {
    await this.page.route(url, route => {
      route.fulfill({
        status: status,
        contentType: 'application/json',
        body: JSON.stringify({ error: message })
      });
    });
  }

  /**
   * Wait for API call to complete
   */
  async waitForApiCall(url: string) {
    await this.page.waitForResponse(response => 
      response.url().includes(url) && response.status() < 400
    );
  }

  /**
   * Wait for multiple API calls to complete
   */
  async waitForApiCalls(urls: string[]) {
    await Promise.all(urls.map(url => this.waitForApiCall(url)));
  }

  /**
   * Get API response data
   */
  async getApiResponse(url: string) {
    const response = await this.page.waitForResponse(response => 
      response.url().includes(url)
    );
    
    return response.json();
  }

  /**
   * Check if API endpoint is available
   */
  async isApiAvailable(endpoint: string) {
    try {
      const response = await this.page.request.get(endpoint);
      return response.ok();
    } catch {
      return false;
    }
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    // Check if API is available
    const isApiAvailable = await this.isApiAvailable('/api/terms/');
    if (!isApiAvailable) {
      throw new Error('API is not available for testing');
    }
    
    // Setup test data
    await this.setupTestData();
  }

  /**
   * Cleanup test environment
   */
  async cleanupTestEnvironment() {
    await this.cleanupTestData();
  }

  /**
   * Get test data statistics
   */
  async getTestDataStats() {
    const terms = await this.getAllTerms();
    const pendingVersions = await this.getPendingVersions();
    
    return {
      totalTerms: terms.length,
      pendingVersions: pendingVersions.length,
      domains: [...new Set(terms.map((term: any) => term.domain?.name).filter(Boolean))]
    };
  }

  /**
   * Create a test term with unique name to avoid conflicts
   */
  async createUniqueTerm(domain: string, definition?: string) {
    const timestamp = Date.now();
    const termName = `test_${timestamp}_term`;
    return await this.createTerm(termName, domain, definition);
  }

  /**
   * Create a test term with specific approval state
   */
  async createTermWithApprovalState(termName: string, domain: string, definition: string, approvalState: 'no_approvals' | 'one_approval' | 'two_approvals' | 'published') {
    const result = await this.createTerm(termName, domain, definition);
    
    if (approvalState !== 'no_approvals') {
      // Get all users to assign as approvers
      const users = await this.getAllUsers();
      const approvers = users.slice(0, approvalState === 'one_approval' ? 1 : 2);
      
      for (const approver of approvers) {
        await this.approveVersion(result.version?.id || result.id);
      }
      
      if (approvalState === 'published') {
        await this.publishVersion(result.version?.id || result.id);
      }
    }
    
    return result;
  }

  /**
   * Get all users via API
   */
  async getAllUsers() {
    const response = await this.page.request.get('/api/users/');
    
    if (!response.ok()) {
      throw new Error(`Failed to get users: ${response.status()}`);
    }
    
    return response.json();
  }

  /**
   * Reset approval state for a version
   */
  async resetVersionApprovalState(versionId: string) {
    // This would need to be implemented based on the API
    // For now, we'll just log it
    console.log(`Resetting approval state for version ${versionId}`);
  }
}
