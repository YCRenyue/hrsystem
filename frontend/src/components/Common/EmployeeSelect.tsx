/**
 * EmployeeSelect - 按姓名或工号远程搜索在职员工的下拉框
 */
import React, { useEffect, useState } from "react";
import { Select, Spin } from "antd";
import { employeeService } from "../../services/employeeService";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

interface EmployeeSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

interface EmployeeOption {
  value: string;
  label: string;
}

const PAGE_SIZE = 20;

/**
 * 可在 Form.Item 中直接使用，值为 employee_id
 */
const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
  value,
  onChange,
  placeholder = "搜索员工姓名或工号",
}) => {
  const [keywordInput, setKeywordInput] = useState("");
  const keyword = useDebouncedValue(keywordInput.trim(), 300);
  const [options, setOptions] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    employeeService
      .getEmployees({ page: 1, size: PAGE_SIZE, status: "active", keyword: keyword || undefined })
      .then((result) => {
        if (stale) return;
        setOptions(result.items.map((e) => ({
          value: e.employee_id,
          label: `${e.employee_number} - ${e.name || ""}`,
        })));
      })
      .catch(() => {
        if (!stale) setOptions([]);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [keyword]);

  return (
    <Select
      showSearch
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      filterOption={false}
      onSearch={setKeywordInput}
      options={options}
      notFoundContent={loading ? <Spin size="small" /> : "没有匹配的员工"}
    />
  );
};

export default EmployeeSelect;
