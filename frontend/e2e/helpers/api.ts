import { Page } from '@playwright/test';
import { TEST_TERMS, TEST_DEFINITIONS, TEST_DOMAINS } from '../fixtures/testData';

export class ApiHelper {
  constructor(private page: Page) {}

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
   * Create a test term via API
   */
  async createTerm(termName: string, domain: string, definition?: string) {
    const response = await this.page.request.post('/api/terms/', {
      data: {
        term: { text: termName },
        domain: { name: domain },
        content: definition || TEST_DEFINITIONS[termName.toUpperCase() as keyof typeof TEST_DEFINITIONS] || 'Test definition'
      }
    });
    
    if (!response.ok()) {
      throw new Error(`Failed to create term: ${response.status()}`);
    }
    
    return response.json();
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
    
    return response.json();
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
}
