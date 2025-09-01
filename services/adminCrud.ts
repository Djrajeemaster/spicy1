

export interface CrudOptions {
  entity: string;
  operation: 'list' | 'get' | 'create' | 'update' | 'delete';
  limit?: number;
  cursor?: string;
  query?: string;
  data?: any;
  id?: string;
  elevationToken?: string;
}

class AdminCrudService {
  private async makeRequest(options: CrudOptions) {
    const params = new URLSearchParams({
      op: options.operation,
      entity: options.entity,
    });

    if (options.limit) params.set('limit', options.limit.toString());
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.query) params.set('q', options.query);
    if (options.id) params.set('id', options.id);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.elevationToken) {
      headers['x-admin-elevation'] = options.elevationToken;
    }

    const response = await fetch(`http://localhost:3000/api/admin/crud?${params}`, {
      method: options.data ? 'POST' : 'GET',
      headers,
      credentials: 'include',
      ...(options.data ? { body: JSON.stringify(options.data) } : {}),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`CRUD operation failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async list(entity: string, limit?: number, cursor?: string, query?: string) {
    return this.makeRequest({
      entity,
      operation: 'list',
      limit,
      cursor,
      query,
    });
  }

  async get(entity: string, id: string) {
    return this.makeRequest({
      entity,
      operation: 'get',
      id,
    });
  }

  async create(entity: string, data: any, elevationToken: string) {
    return this.makeRequest({
      entity,
      operation: 'create',
      data,
      elevationToken,
    });
  }

  async update(entity: string, id: string, data: any, elevationToken: string) {
    return this.makeRequest({
      entity,
      operation: 'update',
      id,
      data,
      elevationToken,
    });
  }

  async delete(entity: string, id: string, elevationToken: string) {
    return this.makeRequest({
      entity,
      operation: 'delete',
      id,
      elevationToken,
    });
  }
}

export const adminCrudService = new AdminCrudService();

// Export individual functions for backward compatibility
export const { list, get, create, update } = adminCrudService;
export const del = adminCrudService.delete;
