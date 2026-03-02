/**
 * Document Templates for Policy Confirmation and Training Commitment
 */

export interface DocumentSection {
  heading: string;
  content: string;
  subItems?: string[];
}

export interface DocumentTemplate {
  title: string;
  version: string;
  preamble: string;
  sections: DocumentSection[];
  closingStatement: string;
}

export const POLICY_CONFIRMATION_TEMPLATE: DocumentTemplate = {
  title: "公司制度阅读确认表",
  version: "1.0",
  preamble:
    "本人已认真阅读并充分理解公司各项规章制度，" +
    "现郑重确认如下：",
  sections: [
    {
      heading: "一、员工手册",
      content: "本人已仔细阅读《员工手册》全部内容，了解公司的企业文化、" +
        "组织架构、岗位职责及员工行为规范。",
    },
    {
      heading: "二、考勤管理制度",
      content: "本人已了解公司考勤管理制度，包括但不限于：",
      subItems: [
        "工作时间及作息安排",
        "请假、调休、加班等审批流程",
        "迟到、早退、旷工等处理规定",
      ],
    },
    {
      heading: "三、薪酬福利制度",
      content: "本人已了解公司薪酬结构、发放时间、" +
        "社会保险及公积金缴纳、福利待遇等相关规定。",
    },
    {
      heading: "四、保密制度",
      content: "本人已了解公司保密制度，承诺对在工作中接触到的" +
        "商业秘密、技术秘密、客户信息等予以严格保密，" +
        "未经授权不得向任何第三方披露。",
    },
    {
      heading: "五、安全生产制度",
      content: "本人已了解公司安全生产相关规定，" +
        "承诺遵守安全操作规程，爱护公司财产设备。",
    },
    {
      heading: "六、奖惩制度",
      content: "本人已了解公司奖惩管理办法，包括奖励条件、" +
        "处分种类及适用情形。",
    },
  ],
  closingStatement:
    "本人确认已阅读并理解上述全部公司规章制度，" +
    "承诺在工作中严格遵守。如有违反，本人愿意承担相应责任。",
};

export const TRAINING_COMMITMENT_TEMPLATE: DocumentTemplate = {
  title: "员工培训承诺函",
  version: "1.0",
  preamble:
    "本人作为公司员工，就参加公司组织的各类培训事宜，" +
    "郑重承诺如下：",
  sections: [
    {
      heading: "一、培训参与",
      content: "本人承诺按时参加公司安排的各项培训活动，" +
        "包括但不限于入职培训、岗位技能培训、安全培训等，" +
        "不无故缺席或迟到。",
    },
    {
      heading: "二、学习态度",
      content: "本人承诺在培训期间认真学习，积极参与讨论和实践，" +
        "按要求完成培训考核和作业。",
    },
    {
      heading: "三、知识运用",
      content: "本人承诺将培训所学知识和技能运用于实际工作中，" +
        "不断提升自身专业能力和工作效率。",
    },
    {
      heading: "四、知识产权",
      content: "本人了解并同意，在培训中获得的培训资料、" +
        "课件等知识产权归公司所有，未经许可不得外传或用于非工作目的。",
    },
    {
      heading: "五、服务期约定",
      content: "对于公司出资的专项培训，本人了解并同意遵守" +
        "相关服务期约定。如在服务期内提前离职，" +
        "本人愿按照约定承担相应的培训费用。",
    },
    {
      heading: "六、违约责任",
      content: "如本人违反上述承诺，愿意接受公司根据相关制度" +
        "做出的处理决定，并承担由此产生的一切后果。",
    },
  ],
  closingStatement:
    "本人已认真阅读并充分理解上述全部条款，" +
    "自愿作出以上承诺，并保证切实履行。",
};

export const DOCUMENT_TEMPLATES: Record<string, DocumentTemplate> = {
  policy_ack: POLICY_CONFIRMATION_TEMPLATE,
  training_pledge: TRAINING_COMMITMENT_TEMPLATE,
};
