import { Page } from '@playwright/test';
import { ApiHelper, CreatedResource } from './api';
import { AuthHelper } from './auth';

export interface TestTerm {
  id: string;
  name: string;
  domain: string;
  definition: string;
  approvalState: 'no_approvals' | 'one_approval' | 'two_approvals' | 'published';
}

export interface TestUser {
  username: string;
  password: string;
  domains: string[];
}

export interface TestScenario {
  terms: TestTerm[];
  users: TestUser[];
  description: string;
}

export class TestFixtures {
  private api: ApiHelper;
  private auth: AuthHelper;
  private createdResources: CreatedResource[] = [];

  constructor(private page: Page) {
    this.api = new ApiHelper(page);
    this.auth = new AuthHelper(page);
  }

  /**
   * Create a test term with specific properties
   */
  async createTestTerm(options: {
    name?: string;
    domain: string;
    definition: string;
    approvalState?: 'no_approvals' | 'one_approval' | 'two_approvals' | 'published';
  }): Promise<TestTerm> {
    const termName = options.name || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await this.api.createTermWithApprovalState(
      termName,
      options.domain,
      options.definition,
      options.approvalState || 'no_approvals'
    );

    const testTerm: TestTerm = {
      id: result.id,
      name: termName,
      domain: options.domain,
      definition: options.definition,
      approvalState: options.approvalState || 'no_approvals'
    };

    // Track for cleanup
    this.createdResources.push({
      type: 'term',
      id: result.id,
      name: termName
    });

    return testTerm;
  }

  /**
   * Create multiple test terms for a domain
   */
  async createTestTermsForDomain(domain: string, count: number = 3): Promise<TestTerm[]> {
    const terms: TestTerm[] = [];
    
    for (let i = 0; i < count; i++) {
      const term = await this.createTestTerm({
        domain,
        definition: `Test definition ${i + 1} for ${domain}`,
        approvalState: i === 0 ? 'no_approvals' : i === 1 ? 'one_approval' : 'two_approvals'
      });
      terms.push(term);
    }
    
    return terms;
  }

  /**
   * Create a test scenario with multiple terms and users
   */
  async createTestScenario(scenario: Partial<TestScenario>): Promise<TestScenario> {
    const defaultScenario: TestScenario = {
      terms: [],
      users: [
        { username: 'mariacarter', password: 'mariacarter', domains: ['Physics', 'Chemistry'] },
        { username: 'bencarter', password: 'bencarter', domains: ['Chemistry', 'Biology'] },
        { username: 'sofiarossi', password: 'sofiarossi', domains: ['Computer Science', 'Graph Theory'] }
      ],
      description: 'Default test scenario'
    };

    const finalScenario = { ...defaultScenario, ...scenario };

    // Create terms if specified
    if (finalScenario.terms.length === 0) {
      // Create default terms for each domain
      const domains = [...new Set(finalScenario.users.flatMap(u => u.domains))];
      for (const domain of domains) {
        const domainTerms = await this.createTestTermsForDomain(domain, 2);
        finalScenario.terms.push(...domainTerms);
      }
    } else {
      // Create specified terms
      for (const termSpec of finalScenario.terms) {
        const term = await this.createTestTerm(termSpec);
        // Update the spec with the actual created term
        Object.assign(termSpec, term);
      }
    }

    return finalScenario;
  }

  /**
   * Create a term that needs approval (no approvals yet)
   */
  async createPendingApprovalTerm(domain: string, definition?: string): Promise<TestTerm> {
    return await this.createTestTerm({
      domain,
      definition: definition || `Pending approval term for ${domain}`,
      approvalState: 'no_approvals'
    });
  }

  /**
   * Create a term with one approval
   */
  async createPartiallyApprovedTerm(domain: string, definition?: string): Promise<TestTerm> {
    return await this.createTestTerm({
      domain,
      definition: definition || `Partially approved term for ${domain}`,
      approvalState: 'one_approval'
    });
  }

  /**
   * Create a fully approved term
   */
  async createFullyApprovedTerm(domain: string, definition?: string): Promise<TestTerm> {
    return await this.createTestTerm({
      domain,
      definition: definition || `Fully approved term for ${domain}`,
      approvalState: 'two_approvals'
    });
  }

  /**
   * Create a published term
   */
  async createPublishedTerm(domain: string, definition?: string): Promise<TestTerm> {
    return await this.createTestTerm({
      domain,
      definition: definition || `Published term for ${domain}`,
      approvalState: 'published'
    });
  }

  /**
   * Setup authentication for a specific user
   */
  async setupUserAuth(user: keyof typeof import('../fixtures/testData').TEST_USERS) {
    await this.auth.loginAs(user);
    await this.auth.waitForLoginComplete();
  }

  /**
   * Create a test user session with specific permissions
   */
  async createUserSession(user: keyof typeof import('../fixtures/testData').TEST_USERS) {
    await this.auth.setupTestSession(user);
    return this.auth.getUserDomains(user);
  }

  /**
   * Get a term by name from created terms
   */
  getTermByName(name: string): TestTerm | undefined {
    // This would need to be implemented to track created terms
    // For now, return undefined
    return undefined;
  }

  /**
   * Get all created terms
   */
  getAllCreatedTerms(): TestTerm[] {
    // This would need to be implemented to track created terms
    // For now, return empty array
    return [];
  }

  /**
   * Clean up all created resources
   */
  async cleanup() {
    await this.api.cleanupResources();
    this.createdResources = [];
  }

  /**
   * Clean up specific resources
   */
  async cleanupResources(resourceIds: string[]) {
    await this.api.cleanupResources(resourceIds);
    this.createdResources = this.createdResources.filter(r => !resourceIds.includes(r.id));
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStats() {
    return {
      totalResources: this.createdResources.length,
      resourcesByType: this.createdResources.reduce((acc, resource) => {
        acc[resource.type] = (acc[resource.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Create a complex test scenario for approval workflow testing
   */
  async createApprovalWorkflowScenario(): Promise<TestScenario> {
    const scenario: TestScenario = {
      description: 'Approval workflow test scenario',
      users: [
        { username: 'mariacarter', password: 'mariacarter', domains: ['Physics', 'Chemistry'] },
        { username: 'bencarter', password: 'bencarter', domains: ['Chemistry', 'Biology'] }
      ],
      terms: []
    };

    // Create terms in different approval states
    scenario.terms.push(await this.createPendingApprovalTerm('Physics', 'A term waiting for approval'));
    scenario.terms.push(await this.createPartiallyApprovedTerm('Chemistry', 'A term with one approval'));
    scenario.terms.push(await this.createFullyApprovedTerm('Biology', 'A term ready for publishing'));
    scenario.terms.push(await this.createPublishedTerm('Physics', 'A published term'));

    return scenario;
  }

  /**
   * Create a domain-specific test scenario
   */
  async createDomainScenario(domain: string): Promise<TestScenario> {
    const users = this.auth.getUsersWithDomainAccess(domain);
    
    if (users.length === 0) {
      throw new Error(`No users found with access to domain: ${domain}`);
    }

    const scenario: TestScenario = {
      description: `Test scenario for ${domain} domain`,
      users: users.map(user => ({
        username: user.toLowerCase(),
        password: user.toLowerCase(),
        domains: this.auth.getUserDomains(user)
      })),
      terms: []
    };

    // Create terms for this domain
    scenario.terms.push(await this.createPendingApprovalTerm(domain, `New term in ${domain}`));
    scenario.terms.push(await this.createPartiallyApprovedTerm(domain, `Partially approved term in ${domain}`));
    scenario.terms.push(await this.createFullyApprovedTerm(domain, `Fully approved term in ${domain}`));

    return scenario;
  }
}
