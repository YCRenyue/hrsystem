/**
 * Scheduler Service
 *
 * Manages all scheduled tasks for the HR system:
 * - Onboarding reminders
 * - Welcome messages
 * - Training reminders
 * - Contract expiry reminders
 * - Monthly statistics
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const { Employee, OnboardingProcess } = require('../models');
const notificationService = require('./NotificationService');
const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting scheduler service...');

    // Daily task at 9:00 AM - Check onboarding and send notifications
    this.jobs.push(
      cron.schedule('0 9 * * *', () => {
        this.runDailyOnboardingTask();
      })
    );

    // Daily task at 10:00 AM - Send pre-onboarding reminders (3 days before)
    this.jobs.push(
      cron.schedule('0 10 * * *', () => {
        this.runPreOnboardingReminders();
      })
    );

    // Weekly task on Monday at 9:00 AM - Send welcome messages (1 week after entry)
    this.jobs.push(
      cron.schedule('0 9 * * 1', () => {
        this.runWelcomeMessages();
      })
    );

    // Daily task at 8:00 AM - Send training reminders
    this.jobs.push(
      cron.schedule('0 8 * * *', () => {
        this.runTrainingReminders();
      })
    );

    // Daily task at 9:00 AM - Send contract expiry reminders (30 days before)
    this.jobs.push(
      cron.schedule('0 9 * * *', () => {
        this.runContractExpiryReminders();
      })
    );

    // Monthly task on 1st day at 10:00 AM - Send monthly statistics
    this.jobs.push(
      cron.schedule('0 10 1 * *', () => {
        this.runMonthlyStatistics();
      })
    );

    this.isRunning = true;
    logger.info(`Scheduler started with ${this.jobs.length} jobs`);
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  /**
   * Daily onboarding task - Send onboarding forms to new employees
   * Runs every day at 9:00 AM
   */
  async runDailyOnboardingTask() {
    logger.info('Running daily onboarding task...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find employees whose entry date is today and haven't completed onboarding
      const employees = await Employee.findAll({
        where: {
          entry_date: {
            [Op.eq]: today
          },
          status: 'pending',
          data_complete: false
        },
        include: [
          {
            model: OnboardingProcess,
            as: 'onboardingProcess',
            required: false
          }
        ]
      });

      logger.info(`Found ${employees.length} employees starting today`);

      for (const employee of employees) {
        try {
          // Generate form token if not exists
          let onboardingProcess = employee.onboardingProcess;
          if (!onboardingProcess) {
            onboardingProcess = await OnboardingProcess.create({
              employee_id: employee.employee_id,
              process_status: 'pending',
              form_token: this._generateFormToken()
            });
          }

          // Generate form URL
          const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const formUrl = `${baseUrl}/onboarding/${onboardingProcess.form_token}`;

          // Send notification
          const result = await notificationService.sendOnboardingNotification(
            employee,
            formUrl
          );

          // Update process status
          await onboardingProcess.update({
            process_status: 'sent',
            sent_time: new Date(),
            notification_method: result.channel
          });

          logger.info(`Onboarding notification sent to ${employee.name} via ${result.channel}`);
        } catch (error) {
          logger.error(`Failed to send onboarding notification to ${employee.name}:`, error.message);
        }
      }

      logger.info('Daily onboarding task completed');
    } catch (error) {
      logger.error('Error in daily onboarding task:', error.message);
    }
  }

  /**
   * Pre-onboarding reminders - Send reminders 3 days before entry date
   * Runs every day at 10:00 AM
   */
  async runPreOnboardingReminders() {
    logger.info('Running pre-onboarding reminders...');

    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(0, 0, 0, 0);

      const employees = await Employee.findAll({
        where: {
          entry_date: {
            [Op.eq]: threeDaysFromNow
          },
          status: {
            [Op.in]: ['pending', 'active']
          }
        }
      });

      logger.info(`Found ${employees.length} employees starting in 3 days`);

      for (const employee of employees) {
        try {
          await notificationService.sendPreOnboardingReminder(employee, 3);
          logger.info(`Pre-onboarding reminder sent to ${employee.name}`);
        } catch (error) {
          logger.error(`Failed to send pre-onboarding reminder to ${employee.name}:`, error.message);
        }
      }

      logger.info('Pre-onboarding reminders completed');
    } catch (error) {
      logger.error('Error in pre-onboarding reminders:', error.message);
    }
  }

  /**
   * Welcome messages - Send welcome messages 1 week after entry
   * Runs every Monday at 9:00 AM
   */
  async runWelcomeMessages() {
    logger.info('Running welcome messages...');

    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);

      const employees = await Employee.findAll({
        where: {
          entry_date: {
            [Op.eq]: oneWeekAgo
          },
          status: 'active'
        }
      });

      logger.info(`Found ${employees.length} employees who completed 1 week`);

      for (const employee of employees) {
        try {
          await notificationService.sendWelcomeMessage(employee);
          logger.info(`Welcome message sent to ${employee.name}`);
        } catch (error) {
          logger.error(`Failed to send welcome message to ${employee.name}:`, error.message);
        }
      }

      logger.info('Welcome messages completed');
    } catch (error) {
      logger.error('Error in welcome messages:', error.message);
    }
  }

  /**
   * Training reminders - Send reminders for upcoming training sessions
   * Runs every day at 8:00 AM
   */
  async runTrainingReminders() {
    logger.info('Running training reminders...');

    try {
      // TODO: Implement training schedule model and logic
      // For now, this is a placeholder

      // Find employees with training scheduled for today
      // const trainings = await TrainingSchedule.findAll({...});

      logger.info('Training reminders completed');
    } catch (error) {
      logger.error('Error in training reminders:', error.message);
    }
  }

  /**
   * Contract expiry reminders - Send reminders 30 days before contract expires
   * Runs every day at 9:00 AM
   */
  async runContractExpiryReminders() {
    logger.info('Running contract expiry reminders...');

    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      thirtyDaysFromNow.setHours(0, 0, 0, 0);

      const employees = await Employee.findAll({
        where: {
          contract_end_date: {
            [Op.eq]: thirtyDaysFromNow
          },
          status: 'active'
        }
      });

      logger.info(`Found ${employees.length} employees with contracts expiring in 30 days`);

      for (const employee of employees) {
        try {
          await notificationService.sendContractExpiryReminder(employee, 30);
          logger.info(`Contract expiry reminder sent to ${employee.name}`);
        } catch (error) {
          logger.error(`Failed to send contract expiry reminder to ${employee.name}:`, error.message);
        }
      }

      logger.info('Contract expiry reminders completed');
    } catch (error) {
      logger.error('Error in contract expiry reminders:', error.message);
    }
  }

  /**
   * Monthly statistics - Send monthly statistics to all active employees
   * Runs on 1st day of each month at 10:00 AM
   */
  async runMonthlyStatistics() {
    logger.info('Running monthly statistics...');

    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const monthName = lastMonth.toLocaleString('zh-CN', { year: 'numeric', month: 'long' });

      const employees = await Employee.findAll({
        where: {
          status: 'active'
        }
      });

      logger.info(`Sending monthly statistics to ${employees.length} employees`);

      for (const employee of employees) {
        try {
          // TODO: Calculate actual statistics from database
          // For now, sending placeholder data
          const statistics = {
            month: monthName,
            travelAllowance: 0, // TODO: Calculate from travel records
            canteenExpense: 0, // TODO: Calculate from canteen records
            attendance: 0, // TODO: Calculate from attendance records
            overtime: 0 // TODO: Calculate from overtime records
          };

          await notificationService.sendMonthlyStatistics(employee, statistics);
          logger.info(`Monthly statistics sent to ${employee.name}`);
        } catch (error) {
          logger.error(`Failed to send monthly statistics to ${employee.name}:`, error.message);
        }
      }

      logger.info('Monthly statistics completed');
    } catch (error) {
      logger.error('Error in monthly statistics:', error.message);
    }
  }

  /**
   * Generate a unique form token
   *
   * @private
   * @returns {string} Form token
   */
  _generateFormToken() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Manually trigger a specific task (for testing)
   *
   * @param {string} taskName - Name of the task to run
   */
  async runTask(taskName) {
    const tasks = {
      onboarding: () => this.runDailyOnboardingTask(),
      'pre-onboarding': () => this.runPreOnboardingReminders(),
      welcome: () => this.runWelcomeMessages(),
      training: () => this.runTrainingReminders(),
      'contract-expiry': () => this.runContractExpiryReminders(),
      statistics: () => this.runMonthlyStatistics()
    };

    if (tasks[taskName]) {
      logger.info(`Manually triggering task: ${taskName}`);
      await tasks[taskName]();
    } else {
      throw new Error(`Unknown task: ${taskName}`);
    }
  }

  /**
   * Get scheduler status
   *
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.length,
      notificationChannels: notificationService.getAvailability()
    };
  }
}

// Export singleton instance
module.exports = new SchedulerService();
