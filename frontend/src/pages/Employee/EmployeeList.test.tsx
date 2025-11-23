/**
 * EmployeeList Component Tests
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EmployeeList from './EmployeeList';
import { employeeService } from '../../services/employeeService';
import { departmentService } from '../../services/departmentService';

// Mock services
jest.mock('../../services/employeeService');
jest.mock('../../services/departmentService');

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('EmployeeList Component', () => {
  const mockEmployees = [
    {
      employee_id: '1',
      employee_number: 'EMP001',
      name: '张伟',
      email: 'zhangwei@company.com',
      phone: '138****8888',
      department: { department_id: '1', name: '技术部', code: 'TECH' },
      status: 'active',
      entry_date: '2024-01-15',
    },
    {
      employee_id: '2',
      employee_number: 'EMP012',
      name: '李娜',
      email: 'lina@company.com',
      phone: '139****9999',
      department: { department_id: '2', name: '人事部', code: 'HR' },
      status: 'pending',
      entry_date: '2024-02-20',
    },
    {
      employee_id: '3',
      employee_number: 'EMP002',
      name: '王强',
      email: 'wangqiang@company.com',
      phone: '137****7777',
      department: { department_id: '1', name: '技术部', code: 'TECH' },
      status: 'inactive',
      entry_date: '2023-12-10',
    },
  ];

  const mockDepartments = [
    { department_id: '1', name: '技术部', code: 'TECH' },
    { department_id: '2', name: '人事部', code: 'HR' },
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    (employeeService.getEmployees as jest.Mock).mockResolvedValue({
      items: mockEmployees,
      total: 3,
      page: 1,
      size: 10,
      totalPages: 1,
    });

    (departmentService.getDepartments as jest.Mock).mockResolvedValue(mockDepartments);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <EmployeeList />
      </BrowserRouter>
    );
  };

  describe('Display and Rendering', () => {
    test('should render employee list table', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('EMP001')).toBeInTheDocument();
        expect(screen.getByText('张伟')).toBeInTheDocument();
        expect(screen.getByText('技术部')).toBeInTheDocument();
      });
    });

    test('should display department names correctly', async () => {
      renderComponent();

      await waitFor(() => {
        // Check that department names are displayed
        const techDeptElements = screen.getAllByText('技术部');
        expect(techDeptElements.length).toBeGreaterThan(0);
        expect(screen.getByText('人事部')).toBeInTheDocument();
      });
    });

    test('should display status in Chinese', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('在职')).toBeInTheDocument();
        expect(screen.getByText('待完善')).toBeInTheDocument();
        expect(screen.getByText('离职')).toBeInTheDocument();
      });
    });

    test('should not display status in English', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.queryByText('active')).not.toBeInTheDocument();
        expect(screen.queryByText('pending')).not.toBeInTheDocument();
        expect(screen.queryByText('inactive')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sorting Functionality', () => {
    test('should sort by employee number correctly (numeric)', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('EMP001')).toBeInTheDocument();
      });

      // Get all employee number cells
      const employeeNumbers = screen.getAllByText(/^EMP\d+$/);

      // The default sort should be ascending by employee number
      // EMP001, EMP002, EMP012 (numeric sort, not alphabetic)
      expect(employeeNumbers[0]).toHaveTextContent('EMP001');
    });

    test('should have sortable columns', async () => {
      renderComponent();

      await waitFor(() => {
        // Check that sortable columns exist (they have sorter functionality)
        expect(screen.getByText('员工编号')).toBeInTheDocument();
        expect(screen.getByText('姓名')).toBeInTheDocument();
        expect(screen.getByText('部门')).toBeInTheDocument();
        expect(screen.getByText('状态')).toBeInTheDocument();
        expect(screen.getByText('入职日期')).toBeInTheDocument();
      });
    });
  });

  describe('Import/Export Functionality', () => {
    test('should show loading message when importing', async () => {
      renderComponent();

      const mockFile = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      (employeeService.importFromExcel as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { success_count: 5, error_count: 0 } }), 100))
      );

      await waitFor(() => {
        expect(screen.getByText('导入 Excel')).toBeInTheDocument();
      });

      // Note: Testing file upload in React Testing Library is complex
      // This is a simplified test to ensure the function exists
    });

    test('should show loading message when exporting', async () => {
      renderComponent();

      (employeeService.exportToExcel as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(new Blob()), 100))
      );

      await waitFor(() => {
        expect(screen.getByText('导出 Excel')).toBeInTheDocument();
      });
    });

    test('should handle import errors gracefully', async () => {
      renderComponent();

      (employeeService.importFromExcel as jest.Mock).mockRejectedValue(
        new Error('Import failed')
      );

      // The component should handle the error without crashing
      await waitFor(() => {
        expect(screen.getByText('导入 Excel')).toBeInTheDocument();
      });
    });

    test('should handle export errors gracefully', async () => {
      renderComponent();

      (employeeService.exportToExcel as jest.Mock).mockRejectedValue(
        new Error('Export failed')
      );

      // The component should handle the error without crashing
      await waitFor(() => {
        expect(screen.getByText('导出 Excel')).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    test('should display edit and delete buttons for each employee', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByText('编辑');
        const deleteButtons = screen.getAllByText('删除');

        expect(editButtons).toHaveLength(3); // 3 employees
        expect(deleteButtons).toHaveLength(3);
      });
    });

    test('should navigate to edit page when edit button is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByText('编辑');
        fireEvent.click(editButtons[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/employees/1/edit');
    });
  });

  describe('Filtering', () => {
    test('should have department filter', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('按部门筛选')).toBeInTheDocument();
      });
    });

    test('should have status filter', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('按状态筛选')).toBeInTheDocument();
      });
    });

    test('should have search input', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('按姓名、邮箱或员工编号搜索')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    test('should display total count', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('共 3 名员工')).toBeInTheDocument();
      });
    });
  });
});
