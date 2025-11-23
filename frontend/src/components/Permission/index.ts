/**
 * Permission Components
 *
 * 导出所有权限相关组件
 */

export { RoleGuard } from './RoleGuard';
export { Can } from './Can';
export { default as AccessDenied } from '../pages/AccessDenied/AccessDenied';

// 也可以导出类型
export type { UserRole, DataScope } from '../../contexts/PermissionContext';
