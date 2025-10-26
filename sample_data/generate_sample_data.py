#!/usr/bin/env python3
"""
HR系统样本数据生成器
生成包含20条数据的各类Excel表格
"""

import pandas as pd
from datetime import datetime, timedelta
import random
import uuid

# 设置随机种子以保证可重现性
random.seed(42)

# ==================== 姓名和数据池 ====================
LAST_NAMES = ['张', '王', '李', '赵', '陈', '刘', '杨', '黄', '周', '吴', 
              '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗']

FIRST_NAMES = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋',
               '勇', '艳', '杰', '涛', '明', '超', '秀英', '霞', '平', '刚',
               '桂英', '建华', '建国', '国强', '志强', '秀兰', '桂兰', '春梅']

DEPARTMENTS = ['技术部', '产品部', '人力资源部', '财务部', '市场部', '运营部', '销售部', '客服部']

POSITIONS_BY_DEPT = {
    '技术部': ['Java工程师', 'Python工程师', '前端工程师', '测试工程师', '运维工程师', '架构师'],
    '产品部': ['产品经理', '产品助理', '产品运营', 'UI设计师', 'UX设计师'],
    '人力资源部': ['HR专员', '招聘经理', '薪酬专员', 'HRBP', '培训专员'],
    '财务部': ['会计', '出纳', '财务经理', '审计专员', '成本会计'],
    '市场部': ['市场专员', '品牌经理', '市场策划', '渠道经理', '商务拓展'],
    '运营部': ['运营专员', '数据分析师', '运营经理', '用户运营', '内容运营'],
    '销售部': ['销售代表', '大客户经理', '销售总监', '销售助理', '渠道销售'],
    '客服部': ['客服专员', '客服主管', '售后专员', '客服经理']
}

CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆']

STREETS = ['中山路', '人民路', '建设路', '解放路', '和平路', '新华路', '胜利路', '文化路']

# ==================== 辅助函数 ====================

def generate_name():
    """生成随机中文姓名"""
    return random.choice(LAST_NAMES) + random.choice(FIRST_NAMES)

def generate_phone():
    """生成随机手机号"""
    prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
                '150', '151', '152', '153', '155', '156', '157', '158', '159',
                '180', '181', '182', '183', '184', '185', '186', '187', '188', '189']
    return random.choice(prefixes) + ''.join([str(random.randint(0, 9)) for _ in range(8)])

def generate_id_card():
    """生成随机身份证号"""
    # 地区码
    area_code = '110101'
    # 出生日期
    birth_year = random.randint(1970, 2000)
    birth_month = str(random.randint(1, 12)).zfill(2)
    birth_day = str(random.randint(1, 28)).zfill(2)
    birth_date = f"{birth_year}{birth_month}{birth_day}"
    # 顺序码
    sequence = ''.join([str(random.randint(0, 9)) for _ in range(3)])
    # 校验码
    check_code = str(random.randint(0, 9))
    return f"{area_code}{birth_date}{sequence}{check_code}"

def generate_bank_card():
    """生成随机银行卡号"""
    return '6217' + ''.join([str(random.randint(0, 9)) for _ in range(15)])

def generate_email(name, company='company.com'):
    """根据姓名生成邮箱"""
    # 简单的拼音映射（仅用于演示）
    return f"{name.lower()}.{random.randint(100, 999)}@{company}"

def random_date(start_date, end_date):
    """生成随机日期"""
    time_between = end_date - start_date
    days_between = time_between.days
    random_days = random.randrange(days_between)
    return start_date + timedelta(days=random_days)

# ==================== 1. 员工信息表 ====================

def generate_employees(count=20):
    """生成员工信息样本数据"""
    employees = []
    
    for i in range(count):
        name = generate_name()
        department = random.choice(DEPARTMENTS)
        position = random.choice(POSITIONS_BY_DEPT[department])
        
        entry_date = random_date(datetime(2018, 1, 1), datetime(2024, 10, 1))
        
        employee = {
            '工号': f'EMP{str(i+1).zfill(4)}',
            '姓名': name,
            '性别': random.choice(['男', '女']),
            '出生日期': random_date(datetime(1980, 1, 1), datetime(2002, 12, 31)).strftime('%Y-%m-%d'),
            '身份证号': generate_id_card(),
            '手机号': generate_phone(),
            '邮箱': generate_email(name),
            '部门': department,
            '职位': position,
            '入职日期': entry_date.strftime('%Y-%m-%d'),
            '员工状态': random.choice(['在职', '在职', '在职', '在职', '离职']),
            '用工类型': random.choice(['全职', '全职', '全职', '兼职']),
            '银行卡号': generate_bank_card(),
            '家庭住址': f"{random.choice(CITIES)}市{random.choice(['朝阳区', '海淀区', '西城区', '东城区'])}{random.choice(STREETS)}{random.randint(1, 200)}号",
            '紧急联系人': generate_name(),
            '紧急联系电话': generate_phone(),
        }
        employees.append(employee)
    
    df = pd.DataFrame(employees)
    df.to_excel('员工信息表.xlsx', index=False, sheet_name='员工信息')
    print(f"✅ 已生成: 员工信息表.xlsx ({count}条数据)")
    return df

# ==================== 2. 部门信息表 ====================

def generate_departments():
    """生成部门信息样本数据"""
    departments = []
    
    dept_info = {
        '技术部': {'编码': 'TECH', '负责人': '张伟', '人数': 25},
        '产品部': {'编码': 'PROD', '负责人': '李明', '人数': 15},
        '人力资源部': {'编码': 'HR', '负责人': '王芳', '人数': 8},
        '财务部': {'编码': 'FIN', '负责人': '赵强', '人数': 10},
        '市场部': {'编码': 'MKT', '负责人': '陈丽', '人数': 12},
        '运营部': {'编码': 'OPS', '负责人': '刘勇', '人数': 18},
        '销售部': {'编码': 'SALES', '负责人': '杨磊', '人数': 20},
        '客服部': {'编码': 'CS', '负责人': '周娜', '人数': 15},
    }
    
    for dept_name, info in dept_info.items():
        department = {
            '部门名称': dept_name,
            '部门编码': info['编码'],
            '上级部门': '总经办' if dept_name != '总经办' else '',
            '部门负责人': info['负责人'],
            '部门人数': info['人数'],
            '成立日期': random_date(datetime(2015, 1, 1), datetime(2020, 12, 31)).strftime('%Y-%m-%d'),
            '部门状态': '启用',
            '部门描述': f'{dept_name}负责公司的相关业务',
        }
        departments.append(department)
    
    df = pd.DataFrame(departments)
    df.to_excel('部门信息表.xlsx', index=False, sheet_name='部门信息')
    print(f"✅ 已生成: 部门信息表.xlsx ({len(departments)}条数据)")
    return df

# ==================== 3. 考勤记录表 ====================

def generate_attendance(count=20):
    """生成考勤记录样本数据"""
    attendance_records = []
    
    for i in range(count):
        attendance_date = datetime.now() - timedelta(days=random.randint(1, 30))
        
        # 上班时间 (8:30-9:30之间)
        check_in_hour = 8
        check_in_minute = random.randint(0, 60)
        if check_in_minute > 30:
            check_in_hour = 9
            check_in_minute = check_in_minute - 30
        
        check_in_time = attendance_date.replace(hour=check_in_hour, minute=check_in_minute)
        
        # 下班时间 (17:30-19:00之间)
        check_out_hour = random.randint(17, 18)
        check_out_minute = random.randint(30, 59) if check_out_hour == 17 else random.randint(0, 59)
        check_out_time = attendance_date.replace(hour=check_out_hour, minute=check_out_minute)
        
        # 计算工时
        work_hours = round((check_out_time - check_in_time).seconds / 3600, 2)
        
        # 确定状态
        if check_in_minute > 30 and check_in_hour == 9:
            status = '迟到'
        elif check_out_hour < 18:
            status = '早退'
        else:
            status = random.choice(['正常', '正常', '正常', '正常', '请假'])
        
        record = {
            '工号': f'EMP{str(random.randint(1, 20)).zfill(4)}',
            '姓名': generate_name(),
            '考勤日期': attendance_date.strftime('%Y-%m-%d'),
            '上班打卡时间': check_in_time.strftime('%H:%M:%S'),
            '下班打卡时间': check_out_time.strftime('%H:%M:%S'),
            '工作时长(小时)': work_hours,
            '考勤状态': status,
            '迟到分钟': max(0, check_in_minute - 30) if check_in_hour == 9 else 0,
            '早退分钟': max(0, (18 * 60) - (check_out_hour * 60 + check_out_minute)),
            '打卡地点': random.choice(['公司总部', '分公司', '客户现场']),
            '打卡来源': random.choice(['钉钉', '钉钉', '钉钉', '手动录入']),
            '异常说明': '' if status == '正常' else random.choice(['交通拥堵', '临时会议', '外出办事', '']),
        }
        attendance_records.append(record)
    
    df = pd.DataFrame(attendance_records)
    df.to_excel('考勤记录表.xlsx', index=False, sheet_name='考勤记录')
    print(f"✅ 已生成: 考勤记录表.xlsx ({count}条数据)")
    return df

# ==================== 4. 年假管理表 ====================

def generate_annual_leaves(count=20):
    """生成年假管理样本数据"""
    leaves = []
    
    for i in range(count):
        total_days = random.choice([5, 7, 10, 12, 15])  # 根据工龄不同
        used_days = round(random.uniform(0, total_days), 1)
        
        leave = {
            '工号': f'EMP{str(i+1).zfill(4)}',
            '姓名': generate_name(),
            '年度': 2024,
            '总天数': total_days,
            '已使用天数': used_days,
            '剩余天数': round(total_days - used_days, 1),
            '年假天数': round(used_days * 0.6, 1),
            '病假天数': round(used_days * 0.2, 1),
            '事假天数': round(used_days * 0.2, 1),
            '调休天数': random.randint(0, 3),
            '已使用调休': random.randint(0, 2),
            '工龄(年)': random.randint(1, 10),
            '状态': '生效',
        }
        leaves.append(leave)
    
    df = pd.DataFrame(leaves)
    df.to_excel('年假管理表.xlsx', index=False, sheet_name='年假管理')
    print(f"✅ 已生成: 年假管理表.xlsx ({count}条数据)")
    return df

# ==================== 5. 社保公积金表 ====================

def generate_social_security(count=20):
    """生成社保公积金样本数据"""
    records = []
    
    for i in range(count):
        base_amount = random.choice([5000, 6000, 8000, 10000, 12000, 15000, 20000])
        
        # 养老保险
        pension_company = round(base_amount * 0.16, 2)
        pension_personal = round(base_amount * 0.08, 2)
        
        # 医疗保险
        medical_company = round(base_amount * 0.10, 2)
        medical_personal = round(base_amount * 0.02, 2)
        
        # 失业保险
        unemployment_company = round(base_amount * 0.007, 2)
        unemployment_personal = round(base_amount * 0.003, 2)
        
        # 工伤保险
        injury_company = round(base_amount * 0.005, 2)
        
        # 生育保险
        maternity_company = round(base_amount * 0.008, 2)
        
        # 住房公积金
        housing_fund_company = round(base_amount * 0.12, 2)
        housing_fund_personal = round(base_amount * 0.12, 2)
        
        total_company = pension_company + medical_company + unemployment_company + injury_company + maternity_company + housing_fund_company
        total_personal = pension_personal + medical_personal + unemployment_personal + housing_fund_personal
        
        record = {
            '工号': f'EMP{str(i+1).zfill(4)}',
            '姓名': generate_name(),
            '年月': (datetime.now() - timedelta(days=random.randint(0, 180))).strftime('%Y-%m'),
            '缴纳基数': base_amount,
            '养老保险-公司': pension_company,
            '养老保险-个人': pension_personal,
            '医疗保险-公司': medical_company,
            '医疗保险-个人': medical_personal,
            '失业保险-公司': unemployment_company,
            '失业保险-个人': unemployment_personal,
            '工伤保险-公司': injury_company,
            '生育保险-公司': maternity_company,
            '住房公积金-公司': housing_fund_company,
            '住房公积金-个人': housing_fund_personal,
            '公司合计': round(total_company, 2),
            '个人合计': round(total_personal, 2),
            '总计': round(total_company + total_personal, 2),
            '缴纳状态': random.choice(['已缴纳', '已缴纳', '待缴纳']),
        }
        records.append(record)
    
    df = pd.DataFrame(records)
    df.to_excel('社保公积金表.xlsx', index=False, sheet_name='社保公积金')
    print(f"✅ 已生成: 社保公积金表.xlsx ({count}条数据)")
    return df

# ==================== 6. 出差补助表 ====================

def generate_business_trips(count=20):
    """生成出差补助样本数据"""
    trips = []
    
    destinations = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆']
    
    for i in range(count):
        start_date = random_date(datetime.now() - timedelta(days=90), datetime.now())
        days = random.randint(1, 7)
        end_date = start_date + timedelta(days=days)
        
        daily_allowance = random.choice([200, 300, 400, 500])
        accommodation = random.randint(200, 800) * days
        transportation = random.randint(500, 2000)
        meal = random.randint(100, 300) * days
        
        total = daily_allowance * days + accommodation + transportation + meal
        
        trip = {
            '出差单号': f'BT{datetime.now().strftime("%Y%m")}{str(i+1).zfill(4)}',
            '工号': f'EMP{str(random.randint(1, 20)).zfill(4)}',
            '姓名': generate_name(),
            '出差目的地': random.choice(destinations),
            '出差事由': random.choice(['客户拜访', '项目实施', '技术培训', '业务洽谈', '会议参加']),
            '开始日期': start_date.strftime('%Y-%m-%d'),
            '结束日期': end_date.strftime('%Y-%m-%d'),
            '出差天数': days,
            '日补助标准': daily_allowance,
            '住宿补助': accommodation,
            '交通补助': transportation,
            '餐饮补助': meal,
            '补助总额': total,
            '审批状态': random.choice(['待审批', '已批准', '已批准', '已支付']),
            '提交日期': start_date.strftime('%Y-%m-%d'),
        }
        trips.append(trip)
    
    df = pd.DataFrame(trips)
    df.to_excel('出差补助表.xlsx', index=False, sheet_name='出差补助')
    print(f"✅ 已生成: 出差补助表.xlsx ({count}条数据)")
    return df

# ==================== 7. 就餐记录表 ====================

def generate_meal_records(count=20):
    """生成就餐记录样本数据"""
    meals = []
    
    meal_types = {
        '早餐': (5, 15),
        '午餐': (15, 30),
        '晚餐': (15, 35),
    }
    
    for i in range(count):
        meal_type = random.choice(list(meal_types.keys()))
        price_range = meal_types[meal_type]
        original_amount = round(random.uniform(price_range[0], price_range[1]), 2)
        subsidy = round(original_amount * random.choice([0.5, 0.6, 0.8]), 2)
        actual_amount = round(original_amount - subsidy, 2)
        
        meal = {
            '工号': f'EMP{str(random.randint(1, 20)).zfill(4)}',
            '姓名': generate_name(),
            '就餐日期': (datetime.now() - timedelta(days=random.randint(1, 30))).strftime('%Y-%m-%d'),
            '餐次类型': meal_type,
            '食堂位置': random.choice(['总部一楼食堂', '总部二楼食堂', '分部食堂']),
            '原价金额': original_amount,
            '补贴金额': subsidy,
            '实付金额': actual_amount,
            '支付方式': random.choice(['饭卡', '饭卡', '手机支付', '现金']),
            '评分': random.randint(3, 5),
        }
        meals.append(meal)
    
    df = pd.DataFrame(meals)
    df.to_excel('就餐记录表.xlsx', index=False, sheet_name='就餐记录')
    print(f"✅ 已生成: 就餐记录表.xlsx ({count}条数据)")
    return df

# ==================== 8. 入职流程表 ====================

def generate_onboarding(count=20):
    """生成入职流程样本数据"""
    processes = []
    
    for i in range(count):
        created_date = random_date(datetime.now() - timedelta(days=60), datetime.now())
        
        process = {
            '工号': f'EMP{str(i+1).zfill(4)}',
            '姓名': generate_name(),
            '流程状态': random.choice(['待发送', '已发送', '已完成', '已完成', '已完成']),
            '推送渠道': random.choice(['钉钉', '钉钉', '短信', '邮件']),
            '推送时间': created_date.strftime('%Y-%m-%d %H:%M:%S'),
            '表单完成时间': (created_date + timedelta(days=random.randint(1, 7))).strftime('%Y-%m-%d %H:%M:%S') if random.random() > 0.3 else '',
            '数据完整度': random.choice(['100%', '100%', '80%', '60%']),
            '创建时间': created_date.strftime('%Y-%m-%d %H:%M:%S'),
            '创建人': random.choice(['HR001', 'HR002', 'HR003']),
        }
        processes.append(process)
    
    df = pd.DataFrame(processes)
    df.to_excel('入职流程表.xlsx', index=False, sheet_name='入职流程')
    print(f"✅ 已生成: 入职流程表.xlsx ({count}条数据)")
    return df

# ==================== 主函数 ====================

def main():
    """主函数：生成所有样本数据"""
    print("=" * 60)
    print("HR系统样本数据生成器")
    print("=" * 60)
    print()
    
    try:
        # 生成各类表格
        generate_employees(20)
        generate_departments()
        generate_attendance(20)
        generate_annual_leaves(20)
        generate_social_security(20)
        generate_business_trips(20)
        generate_meal_records(20)
        generate_onboarding(20)
        
        print()
        print("=" * 60)
        print("✅ 所有样本数据生成完成！")
        print("=" * 60)
        print()
        print("生成的文件列表：")
        print("  1. 员工信息表.xlsx (20条)")
        print("  2. 部门信息表.xlsx (8条)")
        print("  3. 考勤记录表.xlsx (20条)")
        print("  4. 年假管理表.xlsx (20条)")
        print("  5. 社保公积金表.xlsx (20条)")
        print("  6. 出差补助表.xlsx (20条)")
        print("  7. 就餐记录表.xlsx (20条)")
        print("  8. 入职流程表.xlsx (20条)")
        print()
        
    except Exception as e:
        print(f"❌ 生成过程中出错: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
