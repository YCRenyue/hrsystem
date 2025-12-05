const { Op } = require('sequelize');

/**
 * Base Repository Class
 * Provides common CRUD operations for all models
 * Follows repository pattern for data access abstraction
 */
class BaseRepository {
  /**
   * Constructor
   * @param {Model} model - Sequelize model
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * Find record by primary key
   * @param {string|number} id - Primary key value
   * @param {Object} options - Query options
   * @returns {Promise<Model|null>} Found record or null
   */
  async findById(id, options = {}) {
    try {
      return await this.model.findByPk(id, options);
    } catch (error) {
      console.error(`Error finding ${this.model.name} by ID:`, error);
      throw error;
    }
  }

  /**
   * Find one record by criteria
   * @param {Object} where - Where clause
   * @param {Object} options - Query options
   * @returns {Promise<Model|null>} Found record or null
   */
  async findOne(where, options = {}) {
    try {
      return await this.model.findOne({ where, ...options });
    } catch (error) {
      console.error(`Error finding ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Find all records matching criteria
   * @param {Object} where - Where clause
   * @param {Object} options - Query options
   * @returns {Promise<Array<Model>>} Array of records
   */
  async findAll(where = {}, options = {}) {
    try {
      return await this.model.findAll({ where, ...options });
    } catch (error) {
      console.error(`Error finding all ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Find and count all records with pagination
   * @param {Object} where - Where clause
   * @param {Object} options - Query options including limit and offset
   * @returns {Promise<{rows: Array<Model>, count: number}>} Records and count
   */
  async findAndCountAll(where = {}, options = {}) {
    try {
      return await this.model.findAndCountAll({ where, ...options });
    } catch (error) {
      console.error(`Error finding and counting ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Create new record
   * @param {Object} data - Data for new record
   * @param {Object} options - Query options
   * @returns {Promise<Model>} Created record
   */
  async create(data, options = {}) {
    try {
      return await this.model.create(data, options);
    } catch (error) {
      console.error(`Error creating ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Bulk create multiple records
   * @param {Array<Object>} data - Array of data objects
   * @param {Object} options - Query options
   * @returns {Promise<Array<Model>>} Created records
   */
  async bulkCreate(data, options = {}) {
    try {
      return await this.model.bulkCreate(data, options);
    } catch (error) {
      console.error(`Error bulk creating ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Update record by primary key
   * @param {string|number} id - Primary key value
   * @param {Object} data - Data to update
   * @param {Object} options - Query options
   * @returns {Promise<Model|null>} Updated record or null
   */
  async update(id, data, options = {}) {
    try {
      const record = await this.findById(id);
      if (!record) {
        return null;
      }
      return await record.update(data, options);
    } catch (error) {
      console.error(`Error updating ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Bulk update records matching criteria
   * @param {Object} where - Where clause
   * @param {Object} data - Data to update
   * @param {Object} options - Query options
   * @returns {Promise<number>} Number of affected rows
   */
  async bulkUpdate(where, data, options = {}) {
    try {
      const [affectedCount] = await this.model.update(data, { where, ...options });
      return affectedCount;
    } catch (error) {
      console.error(`Error bulk updating ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Delete record by primary key
   * @param {string|number} id - Primary key value
   * @param {Object} options - Query options
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id, options = {}) {
    try {
      const record = await this.findById(id);
      if (!record) {
        return false;
      }
      await record.destroy(options);
      return true;
    } catch (error) {
      console.error(`Error deleting ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Bulk delete records matching criteria
   * @param {Object} where - Where clause
   * @param {Object} options - Query options
   * @returns {Promise<number>} Number of deleted rows
   */
  async bulkDelete(where, options = {}) {
    try {
      return await this.model.destroy({ where, ...options });
    } catch (error) {
      console.error(`Error bulk deleting ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Count records matching criteria
   * @param {Object} where - Where clause
   * @param {Object} options - Query options
   * @returns {Promise<number>} Count of records
   */
  async count(where = {}, options = {}) {
    try {
      return await this.model.count({ where, ...options });
    } catch (error) {
      console.error(`Error counting ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Check if record exists
   * @param {Object} where - Where clause
   * @returns {Promise<boolean>} True if exists
   */
  async exists(where) {
    try {
      const count = await this.count(where);
      return count > 0;
    } catch (error) {
      console.error(`Error checking existence of ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Paginate results
   * @param {Object} options - Pagination options
   * @param {number} options.page - Page number (1-indexed)
   * @param {number} options.limit - Records per page
   * @param {Object} options.where - Where clause
   * @param {Object} options.order - Order clause
   * @returns {Promise<Object>} Paginated results with metadata
   */
  async paginate({
    page = 1, limit = 10, where = {}, order = [], ...options
  } = {}) {
    try {
      const offset = (page - 1) * limit;

      const { rows, count } = await this.findAndCountAll(where, {
        limit,
        offset,
        order,
        ...options
      });

      const totalPages = Math.ceil(count / limit);

      return {
        data: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error(`Error paginating ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Search records with text matching
   * @param {string} searchTerm - Search term
   * @param {Array<string>} fields - Fields to search in
   * @param {Object} options - Additional query options
   * @returns {Promise<Array<Model>>} Matching records
   */
  async search(searchTerm, fields = [], options = {}) {
    try {
      const searchConditions = fields.map((field) => ({
        [field]: { [Op.like]: `%${searchTerm}%` }
      }));

      return await this.findAll(
        { [Op.or]: searchConditions },
        options
      );
    } catch (error) {
      console.error(`Error searching ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Execute raw SQL query
   * @param {string} sql - SQL query
   * @param {Object} options - Query options
   * @returns {Promise<any>} Query result
   */
  async rawQuery(sql, options = {}) {
    try {
      return await this.model.sequelize.query(sql, options);
    } catch (error) {
      console.error(`Error executing raw query on ${this.model.name}:`, error);
      throw error;
    }
  }
}

module.exports = BaseRepository;
