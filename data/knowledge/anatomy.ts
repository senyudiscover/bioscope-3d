// BioScope 知识数据层 v0.1
//
// 目标：把“知识内容”与“3D 模型数据”彻底解耦。
// 3D structure（来自 @vixotic/vanatome-atlas）只是知识的入口之一，不是知识的边界：
// KnowledgeNode 可以绑定 0 个、1 个或多个真实 3D structure id。
//
// 内容原则：
//   - 面向中文本科生物学初学者，中文为主、英文仅作术语辅助；
//   - 每个节点最多 3 个核心功能、最多 5 个关联知识、重点解释 1 个核心机制；
//   - 段落尽量短，不做长百科文章。

export type KnowledgeScale =
  | 'membrane'
  | 'plant'
  | 'human'
  | 'organ'
  | 'tissue'
  | 'cell'
  | 'organelle'
  | 'molecule';

export type KnowledgeKeyStructure = {
  /** 可选：指向某个 KnowledgeNode id（如果该结构本身也有知识卡）。 */
  id?: string;
  nameZh: string;
  nameEn?: string;
  /** 可选：绑定真实 3D structure id（仅当 atlas 中存在该结构时填写）。 */
  modelRef?: string;
};

/** Related Knowledge 的关系类型（轻量，不做完整知识图谱）。 */
export type KnowledgeRelationType =
  | 'requires'
  | 'produces'
  | 'contains'
  | 'participates_in'
  | 'related_to'
  | 'transports'
  | 'supports';

export type KnowledgeRelation = {
  /** 目标知识节点 id。 */
  targetId: string;
  relationType: KnowledgeRelationType;
  /** 一句话关系说明（为什么相关）。 */
  reason: string;
};

/** EXPLORE 问题：简短问题 + 2–4 句回答 + 0–2 个可继续探索的知识节点。 */
export type KnowledgeQuestion = {
  question: string;
  answer: string;
  followUps?: string[];
};

export type KnowledgeNode = {
  id: string;

  nameZh: string;
  nameEn?: string;

  typeZh: string;
  typeEn: string;

  /** 生命尺度：human / organ / tissue / cell / organelle / molecule。 */
  scale: KnowledgeScale;

  /** 归属解剖系统（器官节点使用）。 */
  system?: string;

  /** 01 它是什么？ */
  summary: string;

  /** 02 它在哪里？ */
  location?: string;

  /** 03 它做什么？最多 3 条。 */
  coreFunctions?: string[];

  /** 04 它怎么工作？重点解释 1 个核心机制。 */
  mechanism?: string;

  /** 05 关键结构。modelRef 只绑定真实存在的 3D structure；id 指向知识节点。 */
  keyStructures?: KnowledgeKeyStructure[];

  /** 06 为什么值得理解？ */
  whyItMatters?: string;

  /** 关联知识（最多 5 个），带关系类型与一句话原因。 */
  related?: KnowledgeRelation[];

  /** 本科入门探索问题，取代旧的字串占位。 */
  exploreQuestions?: {
    why?: KnowledgeQuestion;
    how?: KnowledgeQuestion;
    whatIf?: KnowledgeQuestion;
  };

  /**
   * 该节点绑定的真实 3D structure id（0 个 / 1 个 / 多个皆可）。
   * 与 modelRef（单点兼容字段）并存时，modelStructureIds 是权威来源。
   */
  modelStructureIds?: string[];

  /** 兼容字段：单个主 3D structure id（等价于 modelStructureIds[0]）。 */
  modelRef?: string;

  /** 提示更深入尺度的方向（未启用时仅作标记）。 */
  deeperScale?: KnowledgeScale;
};

/** 取节点绑定的主 3D structure id（无则为 undefined）。 */
export function primaryModelStructureId(
  node: KnowledgeNode,
): string | undefined {
  return node.modelStructureIds?.[0] ?? node.modelRef;
}

/** 便捷构造关联关系。 */
export function relation(
  relationType: KnowledgeRelationType,
  targetId: string,
  reason: string,
): KnowledgeRelation {
  return { targetId, relationType, reason };
}

/** relationType 中文标签（用于 UI 小徽标）。 */
export const relationTypeLabels: Record<KnowledgeRelationType, string> = {
  requires: '需要',
  produces: '产生',
  contains: '包含',
  participates_in: '参与',
  related_to: '相关',
  transports: '运输',
  supports: '支持',
};

/** 查询 fromId → toId 的一句话关系原因（无则返回 undefined）。 */
export function getRelationReason(
  fromId: string,
  toId: string,
): string | undefined {
  return knowledgeNodes[fromId]?.related?.find((item) => item.targetId === toId)
    ?.reason;
}

export const knowledgeNodes: Record<string, KnowledgeNode> = {
  // ------------------------------------------------------------------------
  // 顶层入口
  // ------------------------------------------------------------------------
  human: {
    id: 'human',
    nameZh: '人体',
    nameEn: 'Human Body',
    typeZh: '生物体',
    typeEn: 'Organism',
    scale: 'human',
    summary:
      '人体由多个相互联系的器官系统组成，各系统持续协调以维持内环境稳定与生命活动。',
    coreFunctions: [
      '获取并利用物质与能量',
      '感知环境并作出反应',
      '维持稳态并完成生长发育',
    ],
    mechanism:
      '神经、内分泌与循环系统共同传递信息与物质，使局部器官活动整合为整体生命活动。',
    whyItMatters:
      '理解人体可以从器官系统出发，连接器官、组织、细胞与分子，形成从看见结构到理解功能的闭环。',
    related: [
      relation('contains', 'heart', '心脏是推动血液流动的中枢器官'),
      relation('contains', 'lungs', '肺负责气体交换，维持氧气供应'),
      relation('contains', 'liver', '肝脏是代谢与解毒的中枢'),
      relation('contains', 'stomach', '胃负责食物的初步消化'),
      relation('contains', 'kidneys', '肾脏维持水盐与内环境稳定'),
    ],
    exploreQuestions: {
      why: {
        question: '为什么人体需要多个器官系统协同？',
        answer:
          '没有任何一个器官能够单独完成从获取氧气到排出废物的全部任务。多个系统相互配合，才能持续为细胞提供物质、排出代谢产物并维持内环境稳定。',
        followUps: ['blood', 'homeostasis'],
      },
      how: {
        question: '人体如何维持相对稳定的内环境？',
        answer:
          '通过神经、内分泌和循环系统共同构成的调节回路，对体温、血糖和水盐等进行负反馈调节，使偏离的指标重新回到正常范围。',
        followUps: ['homeostasis', 'nervous-system'],
      },
      whatIf: {
        question: '某个系统功能下降会怎样影响全身？',
        answer:
          '各系统相互依赖，一个系统功能下降会沿物质与信息链条波及多个系统，例如循环障碍会同时影响肺的气体交换和肾脏的血液供应。',
        followUps: ['circulation', 'blood'],
      },
    },
  },

  // ------------------------------------------------------------------------
  // 第一批 6 个器官
  // ------------------------------------------------------------------------
  heart: {
    id: 'heart',
    nameZh: '心脏',
    nameEn: 'Heart',
    typeZh: '器官',
    typeEn: 'Organ',
    scale: 'organ',
    system: 'cardiovascular',
    modelRef: 'heart',
    modelStructureIds: ['heart'],
    summary: '心脏是循环系统的核心肌性器官，通过周期性收缩推动血液在全身流动。',
    location: '位于胸腔纵隔内、两肺之间，主体略偏身体左侧。',
    coreFunctions: [
      '推动体循环和肺循环',
      '维持组织的氧气和营养供应',
      '帮助运输二氧化碳和代谢产物',
    ],
    mechanism: '心肌周期性收缩和舒张，并在瓣膜控制下形成方向明确的单向血流。',
    keyStructures: [
      {
        id: 'heart',
        nameZh: '心房',
        nameEn: 'Atria',
        modelRef: 'heart-right-atrium',
      },
      {
        nameZh: '心室',
        nameEn: 'Ventricles',
        modelRef: 'heart-left-ventricle',
      },
      { nameZh: '心肌', nameEn: 'Myocardium' },
      { nameZh: '心脏瓣膜', nameEn: 'Heart valves' },
    ],
    whyItMatters:
      '心脏可以继续连接血液循环、氧运输、心肌细胞、线粒体和 ATP 等知识。',
    related: [
      relation('transports', 'blood', '心脏推动血液在全身流动'),
      relation('requires', 'oxygen', '心肌需要持续供氧以产生能量'),
      relation('contains', 'cardiomyocyte', '心肌细胞构成心脏并产生收缩'),
      relation('requires', 'atp', '心肌收缩需要持续消耗 ATP'),
      relation('participates_in', 'circulation', '心脏是血液循环的动力来源'),
    ],
    deeperScale: 'tissue',
    exploreQuestions: {
      why: {
        question: '为什么心脏需要持续获得大量能量？',
        answer:
          '心肌细胞必须不断收缩和舒张，这些都依赖 ATP。由于心脏几乎持续工作，它依赖稳定的氧气供应和细胞呼吸来维持 ATP 产生。',
        followUps: ['atp', 'cardiomyocyte'],
      },
      how: {
        question: '心脏为什么能够有节律地收缩？',
        answer:
          '心脏的特殊起搏细胞能周期性产生电活动，信号传到心肌细胞后引起钙离子变化，最终驱动肌肉收缩。',
        followUps: ['cardiomyocyte', 'neural-signal'],
      },
      whatIf: {
        question: '如果心肌缺氧会发生什么？',
        answer:
          '缺氧会限制线粒体的氧化磷酸化，使 ATP 生成下降。持续缺氧会削弱心肌收缩能力，并可能造成细胞损伤。',
        followUps: ['oxygen', 'mitochondrion', 'atp'],
      },
    },
  },

  lungs: {
    id: 'lungs',
    nameZh: '肺',
    nameEn: 'Lungs',
    typeZh: '器官',
    typeEn: 'Organ',
    scale: 'organ',
    system: 'respiratory',
    modelRef: 'lungs',
    modelStructureIds: ['lungs'],
    summary:
      '肺是呼吸系统的主要器官，通过气体交换把氧气送入血液并排出二氧化碳。',
    location: '位于胸腔内、心脏两侧，左右各一，由肋与横膈保护。',
    coreFunctions: [
      '实现氧气与二氧化碳的气体交换',
      '调节血液中的氧气含量',
      '帮助维持酸碱平衡',
    ],
    mechanism:
      '呼吸运动带动肺泡通气；肺泡与毛细血管之间靠分压差完成氧与二氧化碳的扩散交换。',
    keyStructures: [
      { nameZh: '肺泡', nameEn: 'Alveoli' },
      { nameZh: '支气管', nameEn: 'Bronchi' },
      { nameZh: '肺叶', nameEn: 'Lobes' },
    ],
    whyItMatters:
      '肺可以连接肺泡、氧气、二氧化碳、血液与细胞呼吸，理解气体如何真正进入细胞。',
    related: [
      relation('contains', 'alveoli', '肺泡是肺内气体交换的功能单位'),
      relation('transports', 'oxygen', '肺将氧气送入血液'),
      relation('produces', 'carbon-dioxide', '肺排出二氧化碳'),
      relation('participates_in', 'blood', '气体通过血液被运输'),
      relation('supports', 'cellular-respiration', '肺为细胞呼吸持续供氧'),
    ],
    deeperScale: 'tissue',
    exploreQuestions: {
      why: {
        question: '为什么肺泡需要很大的总表面积？',
        answer:
          '气体交换的效率与交换面积成正比，肺泡数量极多、总表面积很大，这使氧气和二氧化碳能快速、充分地完成扩散交换。',
        followUps: ['alveoli', 'oxygen'],
      },
      how: {
        question: '氧气是怎么从肺进入血液的？',
        answer:
          '肺泡内氧气分压高于肺毛细血管血液，氧气沿分压差扩散穿过肺泡壁与毛细血管壁，进入血液并与血红蛋白结合。',
        followUps: ['oxygen', 'blood'],
      },
      whatIf: {
        question: '二氧化碳排出受阻会发生什么？',
        answer:
          '二氧化碳在血液中堆积会导致血液酸化，影响呼吸调节与酸碱平衡，进而干扰全身细胞的正常功能。',
        followUps: ['carbon-dioxide', 'homeostasis'],
      },
    },
  },

  liver: {
    id: 'liver',
    nameZh: '肝脏',
    nameEn: 'Liver',
    typeZh: '器官',
    typeEn: 'Organ',
    scale: 'organ',
    system: 'digestive',
    modelRef: 'liver',
    modelStructureIds: ['liver'],
    summary:
      '肝脏是人体最大的代谢器官，在营养处理、物质转化与解毒中发挥核心作用。',
    location: '位于腹腔右上部、横膈下方，大部分被右侧肋骨保护。',
    coreFunctions: [
      '调节血糖并储存糖原',
      '合成胆汁辅助脂肪消化',
      '处理与转化代谢废物',
    ],
    mechanism:
      '肝细胞摄取来自门静脉的营养物质，依机体需求进行合成、储存、转化与解毒。',
    keyStructures: [
      { nameZh: '肝细胞', nameEn: 'Hepatocytes' },
      { nameZh: '肝小叶', nameEn: 'Liver lobule' },
      { nameZh: '胆管', nameEn: 'Bile duct' },
    ],
    whyItMatters:
      '肝脏连接葡萄糖、糖原、胆汁、代谢与血液，是理解营养物质去向的关键枢纽。',
    related: [
      relation('participates_in', 'glucose', '肝脏调节血糖并储存糖原'),
      relation('produces', 'glycogen', '肝脏合成糖原储存葡萄糖'),
      relation('produces', 'bile', '肝脏合成胆汁辅助脂肪消化'),
      relation('participates_in', 'metabolism', '肝脏是物质代谢的枢纽'),
      relation('transports', 'blood', '门静脉血液为肝脏提供原料'),
    ],
    deeperScale: 'cell',
    exploreQuestions: {
      why: {
        question: '为什么肝脏被称为代谢中枢？',
        answer:
          '来自消化道的营养物质先经门静脉进入肝脏，肝脏在这里进行合成、储存、转化与解毒，是全身物质代谢的核心枢纽。',
        followUps: ['metabolism', 'glucose'],
      },
      how: {
        question: '肝脏如何调节血糖浓度？',
        answer:
          '血糖升高时肝脏把葡萄糖合成糖原储存，血糖降低时又分解糖原释放葡萄糖，从而在激素调控下稳定血糖。',
        followUps: ['glucose', 'glycogen'],
      },
      whatIf: {
        question: '肝脏功能受损会影响哪些生理过程？',
        answer:
          '会影响血糖调节、蛋白质合成、解毒和胆汁分泌等多个过程，可能引起营养代谢紊乱与有害物质堆积。',
        followUps: ['metabolism', 'bile'],
      },
    },
  },

  stomach: {
    id: 'stomach',
    nameZh: '胃',
    nameEn: 'Stomach',
    typeZh: '器官',
    typeEn: 'Organ',
    scale: 'organ',
    system: 'digestive',
    modelRef: 'stomach',
    modelStructureIds: ['stomach'],
    summary: '胃是消化管中膨大的肌性器官，负责储存食物并启动蛋白质的化学消化。',
    location: '位于上腹部的左季肋区，连接食管与小肠。',
    coreFunctions: [
      '暂时储存并混合食物',
      '分泌胃酸与胃蛋白酶启动消化',
      '缓慢向小肠推送食糜',
    ],
    mechanism:
      '胃壁肌肉搅拌食物，胃酸营造酸性环境并激活胃蛋白酶原，从而初步分解蛋白质。',
    keyStructures: [
      { nameZh: '胃壁肌肉', nameEn: 'Gastric muscle' },
      { nameZh: '胃腺', nameEn: 'Gastric glands' },
      { nameZh: '胃黏膜', nameEn: 'Gastric mucosa' },
    ],
    whyItMatters:
      '胃连接胃酸、蛋白质、消化、小肠与酶，是理解食物如何在体内被分解的起点。',
    related: [
      relation('produces', 'gastric-acid', '胃壁细胞分泌胃酸'),
      relation('participates_in', 'protein', '胃启动蛋白质的化学消化'),
      relation('participates_in', 'digestion', '胃是消化过程的重要环节'),
      relation('transports', 'small-intestine', '胃把食糜推送入小肠'),
      relation('requires', 'enzyme', '胃蛋白酶参与蛋白质分解'),
    ],
    deeperScale: 'tissue',
    exploreQuestions: {
      why: {
        question: '为什么胃酸这么酸却不会损伤胃壁？',
        answer:
          '胃黏膜分泌的黏液和碳酸氢盐形成保护屏障，同时黏膜细胞不断更新，因此胃酸通常不会损伤正常的胃壁。',
        followUps: ['gastric-acid', 'stomach'],
      },
      how: {
        question: '胃如何把食物变成食糜？',
        answer:
          '胃壁肌肉反复搅拌食物，胃酸营造酸性环境并激活胃蛋白酶原，把食物初步分解为液态的食糜。',
        followUps: ['gastric-acid', 'enzyme'],
      },
      whatIf: {
        question: '胃排空过快会怎样？',
        answer:
          '食物未充分混合消化就进入小肠，会增加小肠消化负担，并可能引起血糖快速波动或不适。',
        followUps: ['small-intestine', 'digestion'],
      },
    },
  },

  kidneys: {
    id: 'kidneys',
    nameZh: '肾脏',
    nameEn: 'Kidneys',
    typeZh: '器官',
    typeEn: 'Organ',
    scale: 'organ',
    system: 'urinary',
    modelRef: 'kidneys',
    modelStructureIds: ['kidneys'],
    summary: '肾脏是泌尿系统的核心器官，通过过滤血液生成尿液以维持内环境稳定。',
    location: '位于腹腔后壁、脊柱两侧，左右各一。',
    coreFunctions: [
      '过滤血液并生成尿液',
      '调节水盐与酸碱平衡',
      '排出含氮代谢废物',
    ],
    mechanism:
      '肾单位中的肾小球过滤血浆，肾小管通过重吸收与分泌精细调节尿液成分。',
    keyStructures: [
      {
        nameZh: '左肾',
        nameEn: 'Left kidney',
        modelRef: 'kidneys-kidney-left',
      },
      {
        nameZh: '右肾',
        nameEn: 'Right kidney',
        modelRef: 'kidneys-kidney-right',
      },
      { nameZh: '肾单位', nameEn: 'Nephron' },
    ],
    whyItMatters:
      '肾脏连接肾单位、血液、尿液、水盐平衡与内环境稳态，理解身体如何自我调节。',
    related: [
      relation('contains', 'nephron', '肾单位是肾脏的功能单位'),
      relation('transports', 'blood', '肾脏持续过滤流经的血液'),
      relation('produces', 'urine', '肾脏生成尿液'),
      relation('participates_in', 'water-salt-balance', '肾脏调节水盐平衡'),
      relation('supports', 'homeostasis', '肾脏维持内环境稳定'),
    ],
    deeperScale: 'tissue',
    exploreQuestions: {
      why: {
        question: '为什么肾脏需要持续获得大量血液？',
        answer:
          '肾脏需要持续过滤血液以清除代谢废物并调节水和电解质，因此血流十分丰富，约占心输出量的很大比例。',
        followUps: ['blood', 'nephron'],
      },
      how: {
        question: '尿液是如何在肾单位中形成的？',
        answer:
          '肾小球过滤血浆形成原尿，肾小管再重吸收有用的水和物质并分泌废物，最终浓缩为尿液排出。',
        followUps: ['nephron', 'urine'],
      },
      whatIf: {
        question: '肾脏过滤功能下降会发生什么？',
        answer:
          '含氮废物和水盐在体内堆积，会干扰酸碱平衡与体液调节，进而影响全身多个系统的正常功能。',
        followUps: ['water-salt-balance', 'homeostasis'],
      },
    },
  },

  brain: {
    id: 'brain',
    nameZh: '脑',
    nameEn: 'Brain',
    typeZh: '器官',
    typeEn: 'Organ',
    scale: 'organ',
    system: 'nervous',
    // atlas 中没有独立的 "brain" 结构；只绑定真实存在的大脑、小脑与脑干。
    modelStructureIds: ['cerebrum', 'cerebellum', 'brainstem'],
    summary:
      '脑是神经系统的控制中枢，负责接收、整合信息并发出指令协调全身活动。',
    location: '位于颅腔内，由颅骨保护，并与脊髓相连。',
    coreFunctions: [
      '接收并整合感觉信息',
      '发出指令调控运动与行为',
      '支持学习、记忆与思维',
    ],
    mechanism:
      '神经元以电信号与化学递质传递信息，多级神经网络对信号进行加工与整合。',
    keyStructures: [
      { nameZh: '大脑', nameEn: 'Cerebrum', modelRef: 'cerebrum' },
      { nameZh: '小脑', nameEn: 'Cerebellum', modelRef: 'cerebellum' },
      { nameZh: '脑干', nameEn: 'Brainstem', modelRef: 'brainstem' },
      { nameZh: '神经元', nameEn: 'Neuron' },
    ],
    whyItMatters:
      '脑连接神经元、神经系统、ATP、氧气与神经信号，理解生命活动如何被协调与控制。',
    related: [
      relation('contains', 'neuron', '神经元是脑的基本功能单位'),
      relation('participates_in', 'nervous-system', '脑是神经系统的控制中枢'),
      relation('requires', 'atp', '神经元活动持续消耗 ATP'),
      relation('requires', 'oxygen', '脑对氧供应极其敏感'),
      relation('transports', 'neural-signal', '脑以神经信号传递信息'),
    ],
    deeperScale: 'cell',
    exploreQuestions: {
      why: {
        question: '为什么脑对氧气供应极其敏感？',
        answer:
          '神经元持续耗能且几乎不储存能量物质，必须依赖持续的氧气和葡萄糖供应来生成 ATP，因此对缺氧非常敏感。',
        followUps: ['oxygen', 'atp'],
      },
      how: {
        question: '神经信号如何在神经元之间传递？',
        answer:
          '动作电位沿轴突传导到达突触，引起神经递质释放，递质与下一神经元受体结合，从而把信息传下去。',
        followUps: ['neuron', 'neural-signal'],
      },
      whatIf: {
        question: '脑供血中断会发生什么？',
        answer:
          '脑细胞会在很短时间内因缺氧而功能障碍，若供血持续中断会造成不可逆的损伤。',
        followUps: ['oxygen', 'circulation'],
      },
    },
  },

  // ------------------------------------------------------------------------
  // 关联知识节点（可以没有 3D 模型）
  // ------------------------------------------------------------------------
  blood: {
    id: 'blood',
    nameZh: '血液',
    nameEn: 'Blood',
    typeZh: '结缔组织',
    typeEn: 'Connective tissue',
    scale: 'tissue',
    summary: '血液是流动的结缔组织，在心脏驱动下连接肺、消化器官与全身细胞。',
    location: '在心脏与血管构成的闭合回路中持续循环。',
    coreFunctions: ['运输气体和营养物质', '参与免疫防御', '调节体温与酸碱平衡'],
    mechanism:
      '血浆承担溶质运输，红细胞中的血红蛋白可逆结合氧，白细胞与血小板参与防御和止血。',
    whyItMatters:
      '血液是器官与细胞之间的“运输网络”，几乎所有物质交换都经由它完成。',
    related: [
      relation('participates_in', 'heart', '血液由心脏驱动循环'),
      relation('transports', 'oxygen', '血液运输氧气到组织'),
      relation('participates_in', 'circulation', '血液是循环回路的主体'),
    ],
  },

  oxygen: {
    id: 'oxygen',
    nameZh: '氧气',
    nameEn: 'Oxygen',
    typeZh: '小分子',
    typeEn: 'Molecule',
    scale: 'molecule',
    summary:
      '氧气是有氧细胞呼吸的末端电子受体，使细胞能够高效释放营养物质中的能量。',
    location: '由肺进入血液，并通过循环运输到组织细胞。',
    coreFunctions: ['支持有氧呼吸', '维持高效 ATP 生成'],
    mechanism:
      '在线粒体电子传递链末端，氧接受电子和质子形成水，维持氧化磷酸化继续进行。',
    whyItMatters:
      '没有氧气，细胞就无法高效产能；理解氧链接着肺、血液与线粒体。',
    related: [
      relation('participates_in', 'blood', '氧气由血液运输'),
      relation('supports', 'atp', '氧化磷酸化依赖氧生成 ATP'),
      relation(
        'participates_in',
        'cellular-respiration',
        '氧气是细胞呼吸的末端电子受体',
      ),
    ],
  },

  cardiomyocyte: {
    id: 'cardiomyocyte',
    nameZh: '心肌细胞',
    nameEn: 'Cardiomyocyte',
    typeZh: '细胞',
    typeEn: 'Cell',
    scale: 'cell',
    summary:
      '心肌细胞是构成心肌并产生收缩力的特化肌细胞，彼此电耦联形成协调活动。',
    coreFunctions: ['产生收缩力', '传播兴奋', '响应自主神经与激素调节'],
    mechanism:
      '动作电位引发细胞内钙浓度升高，钙使肌动蛋白与肌球蛋白发生滑动并产生收缩。',
    whyItMatters: '心脏每一次搏动都来自心肌细胞的协同收缩，并持续消耗 ATP。',
    related: [
      relation('contains', 'heart', '心肌细胞构成心脏'),
      relation('requires', 'atp', '收缩过程持续消耗 ATP'),
      relation('requires', 'oxygen', '心肌细胞需要氧气产能'),
    ],
  },

  atp: {
    id: 'atp',
    nameZh: '三磷酸腺苷',
    nameEn: 'ATP',
    typeZh: '能量载体',
    typeEn: 'Energy carrier',
    scale: 'molecule',
    summary:
      'ATP 是细胞中可快速使用的能量载体，为心肌收缩、离子泵和生物合成等过程供能。',
    coreFunctions: ['驱动机械运动', '维持离子梯度', '连接分解代谢与合成代谢'],
    mechanism:
      'ATP 水解释放的自由能与需要能量的反应偶联，使细胞能够完成非自发过程。',
    whyItMatters: 'ATP 是能量在细胞尺度的通用“货币”，连接呼吸、收缩与合成。',
    related: [
      relation('supports', 'cardiomyocyte', 'ATP 为心肌收缩供能'),
      relation('related_to', 'oxygen', '有氧呼吸高效生成 ATP'),
      relation(
        'participates_in',
        'cellular-respiration',
        'ATP 是细胞呼吸的能量产物',
      ),
    ],
  },

  circulation: {
    id: 'circulation',
    nameZh: '血液循环',
    nameEn: 'Circulation',
    typeZh: '生理过程',
    typeEn: 'Physiological process',
    scale: 'organ',
    summary: '血液循环由心脏、血管和血液共同完成，将物质运输连接成闭合回路。',
    coreFunctions: ['连接肺与组织', '分配营养与激素', '回收代谢产物'],
    mechanism: '心脏建立压力差，血液沿动脉、毛细血管和静脉定向流动。',
    whyItMatters: '血液循环把肺、消化器官与全身细胞串联成一个整体。',
    related: [
      relation('related_to', 'heart', '心脏为循环提供动力'),
      relation('transports', 'blood', '血液在循环回路中流动'),
      relation('transports', 'oxygen', '循环把氧气运往组织'),
    ],
  },

  'cellular-respiration': {
    id: 'cellular-respiration',
    nameZh: '细胞呼吸',
    nameEn: 'Cellular respiration',
    typeZh: '代谢过程',
    typeEn: 'Metabolic process',
    scale: 'cell',
    summary: '细胞呼吸逐步氧化营养物质，并把释放的能量转移到 ATP 中。',
    coreFunctions: ['分解能量物质', '生成 ATP', '维持细胞能量供应'],
    mechanism: '糖酵解、三羧酸循环和氧化磷酸化协同，将化学能转移给 ATP。',
    whyItMatters: '它是理解“吃进去的食物如何变成可用能量”的核心环节。',
    related: [
      relation('requires', 'oxygen', '氧化磷酸化需要氧气'),
      relation('produces', 'atp', '细胞呼吸生成 ATP'),
      relation('participates_in', 'cardiomyocyte', '心肌细胞依赖细胞呼吸产能'),
    ],
  },

  // ---- 肺的关联 ----
  alveoli: {
    id: 'alveoli',
    nameZh: '肺泡',
    nameEn: 'Alveoli',
    typeZh: '结构',
    typeEn: 'Structure',
    scale: 'tissue',
    summary: '肺泡是肺内气体交换的最小功能单位，由单层上皮与丰富毛细血管构成。',
    location: '位于细支气管末端，成簇排列。',
    coreFunctions: ['提供巨大交换面积', '缩短气体扩散距离'],
    mechanism: '肺泡与毛细血管之间气体靠分压差扩散，完成氧入血、二氧化碳出肺。',
    whyItMatters: '肺泡的结构直接决定了呼吸交换的效率。',
    related: [
      relation('contains', 'lungs', '肺泡组成肺的功能单位'),
      relation('transports', 'oxygen', '氧在肺泡进入血液'),
      relation('produces', 'carbon-dioxide', '二氧化碳经肺泡排出'),
    ],
  },

  'carbon-dioxide': {
    id: 'carbon-dioxide',
    nameZh: '二氧化碳',
    nameEn: 'Carbon dioxide',
    typeZh: '小分子',
    typeEn: 'Molecule',
    scale: 'molecule',
    summary: '二氧化碳是细胞呼吸的主要气态产物，经血液运输并由肺排出。',
    coreFunctions: ['作为呼吸代谢产物排出', '参与血液酸碱平衡调节'],
    mechanism: '组织细胞产生的 CO₂ 进入血液，大部分以碳酸氢盐形式运输到肺。',
    whyItMatters: '排出 CO₂ 与摄入 O₂ 同样重要，二者共同维持内环境。',
    related: [
      relation('related_to', 'lungs', '二氧化碳经肺排出'),
      relation('related_to', 'oxygen', '气体交换同时涉及 O₂ 与 CO₂'),
      relation('produces', 'cellular-respiration', '细胞呼吸产生二氧化碳'),
    ],
  },

  // ---- 肝脏的关联 ----
  glucose: {
    id: 'glucose',
    nameZh: '葡萄糖',
    nameEn: 'Glucose',
    typeZh: '单糖',
    typeEn: 'Monosaccharide',
    scale: 'molecule',
    summary: '葡萄糖是细胞最重要的能量底物之一，是血糖的主要成分。',
    coreFunctions: ['提供氧化分解的原料', '转化为糖原储存'],
    mechanism: '细胞通过糖酵解与后续代谢把葡萄糖逐步氧化并生成 ATP。',
    whyItMatters: '血糖浓度是人体严格调控的核心指标之一。',
    related: [
      relation('related_to', 'liver', '肝脏调节血糖浓度'),
      relation('related_to', 'glycogen', '葡萄糖可转化为糖原储存'),
      relation('participates_in', 'metabolism', '葡萄糖是核心能量底物'),
    ],
  },

  glycogen: {
    id: 'glycogen',
    nameZh: '糖原',
    nameEn: 'Glycogen',
    typeZh: '多糖',
    typeEn: 'Polysaccharide',
    scale: 'molecule',
    summary: '糖原是葡萄糖的储存形式，主要储存在肝脏与肌肉中。',
    coreFunctions: ['储存葡萄糖', '在需要时快速释放葡萄糖'],
    mechanism: '胰岛素等激素调控糖原合成与分解，从而稳定血糖。',
    whyItMatters: '糖原解释了身体如何在两餐之间维持血糖稳定。',
    related: [
      relation('related_to', 'liver', '糖原主要储存在肝脏'),
      relation('related_to', 'glucose', '糖原由葡萄糖聚合而成'),
      relation('participates_in', 'metabolism', '糖原参与血糖调节'),
    ],
  },

  bile: {
    id: 'bile',
    nameZh: '胆汁',
    nameEn: 'Bile',
    typeZh: '消化液',
    typeEn: 'Digestive fluid',
    scale: 'tissue',
    summary: '胆汁由肝脏合成，帮助脂肪乳化以便消化与吸收。',
    coreFunctions: ['乳化脂肪', '帮助脂溶性物质吸收'],
    mechanism: '胆汁酸盐降低脂肪的表面张力，使大脂滴分散为小脂滴。',
    whyItMatters: '胆汁连接肝脏与小肠，是脂肪消化不可缺少的一环。',
    related: [
      relation('produces', 'liver', '胆汁由肝脏合成'),
      relation('participates_in', 'digestion', '胆汁乳化脂肪辅助消化'),
      relation('participates_in', 'small-intestine', '胆汁在小肠发挥作用'),
    ],
  },

  metabolism: {
    id: 'metabolism',
    nameZh: '代谢',
    nameEn: 'Metabolism',
    typeZh: '生理过程',
    typeEn: 'Physiological process',
    scale: 'cell',
    summary: '代谢是细胞内所有化学反应的总和，包括分解代谢与合成代谢。',
    coreFunctions: ['分解物质释放能量', '合成细胞所需物质'],
    mechanism: '分解与合成代谢通过 ATP 等中间物相互连接和调节。',
    whyItMatters: '代谢是生命活动的化学基础，把营养、能量与生长统一起来。',
    related: [
      relation('related_to', 'liver', '肝脏是代谢中枢'),
      relation('related_to', 'glucose', '葡萄糖是代谢的重要底物'),
      relation('produces', 'atp', '分解代谢释放能量生成 ATP'),
    ],
  },

  // ---- 胃的关联 ----
  'gastric-acid': {
    id: 'gastric-acid',
    nameZh: '胃酸',
    nameEn: 'Gastric acid',
    typeZh: '消化液',
    typeEn: 'Digestive fluid',
    scale: 'tissue',
    summary: '胃酸是胃壁细胞分泌的盐酸，为胃内消化提供酸性环境。',
    coreFunctions: ['激活胃蛋白酶原', '抑制部分细菌'],
    mechanism: '壁细胞主动分泌 H⁺ 与 Cl⁻，使胃液维持强酸性。',
    whyItMatters: '胃酸是理解胃内化学消化与胃壁保护机制的起点。',
    related: [
      relation('related_to', 'stomach', '胃酸由胃壁细胞分泌'),
      relation('related_to', 'enzyme', '胃酸激活胃蛋白酶原'),
      relation('related_to', 'protein', '胃酸参与蛋白质消化'),
    ],
  },

  protein: {
    id: 'protein',
    nameZh: '蛋白质',
    nameEn: 'Protein',
    typeZh: '生物大分子',
    typeEn: 'Macromolecule',
    scale: 'molecule',
    summary: '蛋白质由氨基酸组成，是细胞结构与功能的主要承担者。',
    coreFunctions: ['构成细胞结构', '催化化学反应', '传递信号'],
    mechanism: '氨基酸序列决定蛋白质折叠，结构又决定其功能。',
    whyItMatters: '消化道把食物蛋白分解为氨基酸，才能被吸收用于合成自身蛋白。',
    related: [
      relation('participates_in', 'stomach', '蛋白质在胃中开始消化'),
      relation('related_to', 'enzyme', '酶催化蛋白质分解'),
      relation('participates_in', 'digestion', '蛋白质消化是消化的一部分'),
    ],
  },

  digestion: {
    id: 'digestion',
    nameZh: '消化',
    nameEn: 'Digestion',
    typeZh: '生理过程',
    typeEn: 'Physiological process',
    scale: 'organ',
    summary: '消化是把食物大分子分解为可吸收小分子的过程，分机械与化学消化。',
    coreFunctions: ['机械研磨食物', '酶解大分子', '为吸收做准备'],
    mechanism: '消化道运动配合各种消化酶，把多糖、蛋白、脂类分解为小分子。',
    whyItMatters: '消化是营养物质进入身体的大门。',
    related: [
      relation('related_to', 'stomach', '胃参与机械与化学消化'),
      relation('requires', 'enzyme', '消化依赖各种酶'),
      relation('related_to', 'small-intestine', '小肠完成大部分消化吸收'),
    ],
  },

  'small-intestine': {
    id: 'small-intestine',
    nameZh: '小肠',
    nameEn: 'Small intestine',
    typeZh: '器官',
    typeEn: 'Organ',
    scale: 'organ',
    system: 'digestive',
    summary: '小肠是消化吸收的主要场所，完成大部分营养物质的分解与吸收。',
    location: '位于腹腔中部，连接胃与大肠。',
    coreFunctions: ['继续消化食糜', '吸收营养', '推送残渣'],
    mechanism: '小肠液与胰液、胆汁协同消化，营养物质经绒毛上皮进入血液或淋巴。',
    whyItMatters: '绝大多数营养都在小肠被吸收，是消化系统的核心工位。',
    related: [
      relation('related_to', 'stomach', '食糜从胃排入小肠'),
      relation('participates_in', 'digestion', '小肠是消化吸收的主要场所'),
      relation('related_to', 'enzyme', '小肠内酶完成分解'),
    ],
  },

  enzyme: {
    id: 'enzyme',
    nameZh: '酶',
    nameEn: 'Enzyme',
    typeZh: '生物催化剂',
    typeEn: 'Catalyst',
    scale: 'molecule',
    summary: '酶是能显著加速化学反应的蛋白质，消化道中负责分解各类大分子。',
    coreFunctions: ['加速大分子分解', '降低反应活化能'],
    mechanism: '酶与底物结合形成复合物，使反应更易发生。',
    whyItMatters: '消化与代谢的每一步都依赖酶，理解酶才能理解反应的速度。',
    related: [
      relation('related_to', 'protein', '酶大多是蛋白质'),
      relation('participates_in', 'digestion', '酶催化大分子分解'),
      relation('participates_in', 'metabolism', '酶参与所有代谢反应'),
    ],
  },

  // ---- 肾脏的关联 ----
  nephron: {
    id: 'nephron',
    nameZh: '肾单位',
    nameEn: 'Nephron',
    typeZh: '结构',
    typeEn: 'Structure',
    scale: 'tissue',
    summary: '肾单位是肾脏的功能单位，由肾小球与肾小管组成。',
    location: '分布在肾皮质与肾髓质中。',
    coreFunctions: ['过滤血浆', '重吸收有用物质', '分泌废物'],
    mechanism: '肾小球过滤血浆形成原尿，肾小管再吸收与分泌，最终浓缩为尿液。',
    whyItMatters: '肾单位解释了血液如何一步步变成尿液。',
    related: [
      relation('contains', 'kidneys', '肾单位是肾脏的功能单位'),
      relation('produces', 'urine', '肾单位浓缩生成尿液'),
      relation('related_to', 'blood', '肾单位过滤血液'),
    ],
  },

  urine: {
    id: 'urine',
    nameZh: '尿液',
    nameEn: 'Urine',
    typeZh: '代谢废物',
    typeEn: 'Waste product',
    scale: 'tissue',
    summary: '尿液是肾脏过滤血液后排出的液体，携带含氮废物与多余水和盐。',
    coreFunctions: ['排出含氮废物', '排出多余水与电解质'],
    mechanism: '原尿经肾小管浓缩与调节后形成尿液，经输尿管膀胱排出。',
    whyItMatters: '尿液成分反映内环境的调节结果。',
    related: [
      relation('produces', 'kidneys', '尿液由肾脏生成'),
      relation('related_to', 'nephron', '肾单位形成尿液'),
      relation('participates_in', 'water-salt-balance', '排尿调节水盐平衡'),
    ],
  },

  'water-salt-balance': {
    id: 'water-salt-balance',
    nameZh: '水盐平衡',
    nameEn: 'Water–salt balance',
    typeZh: '生理过程',
    typeEn: 'Physiological process',
    scale: 'organ',
    summary: '水盐平衡是机体对水分与电解质浓度进行调控并保持稳定的过程。',
    coreFunctions: ['调节体液量', '维持电解质浓度稳定'],
    mechanism: '肾脏在激素调控下调整水和盐的重吸收与排出。',
    whyItMatters: '水盐平衡是内环境稳态最直观的体现之一。',
    related: [
      relation('participates_in', 'kidneys', '肾脏调节水盐平衡'),
      relation('related_to', 'urine', '尿液排出多余水与盐'),
      relation('supports', 'homeostasis', '水盐平衡是稳态的一部分'),
    ],
  },

  homeostasis: {
    id: 'homeostasis',
    nameZh: '内环境稳态',
    nameEn: 'Homeostasis',
    typeZh: '生理过程',
    typeEn: 'Physiological process',
    scale: 'organ',
    summary: '稳态是机体通过调节维持内环境相对稳定的能力。',
    coreFunctions: ['维持体温稳定', '维持血糖与水盐稳定'],
    mechanism: '感受器、控制中枢与效应器构成负反馈回路，纠正偏离。',
    whyItMatters: '稳态是“生命为什么能正常运行”的总纲。',
    related: [
      relation('related_to', 'kidneys', '肾脏维持内环境稳定'),
      relation('related_to', 'water-salt-balance', '水盐平衡是稳态核心'),
      relation('related_to', 'blood', '血液参与稳态调节'),
    ],
  },

  // ---- 脑的关联 ----
  neuron: {
    id: 'neuron',
    nameZh: '神经元',
    nameEn: 'Neuron',
    typeZh: '细胞',
    typeEn: 'Cell',
    scale: 'cell',
    summary: '神经元是神经系统的基本结构与功能单位，负责接收、传导与传递信号。',
    coreFunctions: ['接收信号', '传导动作电位', '释放神经递质'],
    mechanism: '动作电位沿轴突传导，并在突触处通过递质传递给下一个神经元。',
    whyItMatters: '所有脑功能最终都落实到神经元的活动。',
    related: [
      relation('contains', 'brain', '神经元构成脑'),
      relation('transports', 'neural-signal', '神经元传递神经信号'),
      relation('requires', 'atp', '神经元活动消耗 ATP'),
    ],
  },

  'nervous-system': {
    id: 'nervous-system',
    nameZh: '神经系统',
    nameEn: 'Nervous system',
    typeZh: '器官系统',
    typeEn: 'Organ system',
    scale: 'organ',
    summary: '神经系统由中枢与周围神经组成，负责感知、整合并指挥机体活动。',
    coreFunctions: ['感知内外变化', '整合并作出决策', '调控运动与内脏'],
    mechanism: '感受器把刺激转为神经信号，中枢处理后经传出通路支配效应器。',
    whyItMatters: '神经系统把分散的器官活动组织成协调的整体。',
    related: [
      relation('contains', 'brain', '脑是神经系统的中枢'),
      relation('contains', 'neuron', '神经系统由神经元构成'),
      relation('transports', 'neural-signal', '神经信号在系统中传递'),
    ],
  },

  'neural-signal': {
    id: 'neural-signal',
    nameZh: '神经信号',
    nameEn: 'Neural signal',
    typeZh: '生理过程',
    typeEn: 'Physiological process',
    scale: 'cell',
    summary: '神经信号是神经元以电与化学方式传递的信息，是神经系统的工作语言。',
    coreFunctions: ['编码刺激强度与频率', '沿轴突快速传导'],
    mechanism: '膜电位去极化形成动作电位，突触处转为递质完成跨细胞传递。',
    whyItMatters: '理解神经信号才能理解思维与行为的物质基础。',
    related: [
      relation('related_to', 'neuron', '神经元产生神经信号'),
      relation('related_to', 'brain', '脑整合神经信号'),
      relation('requires', 'atp', '信号传递消耗 ATP'),
    ],
  },

  // ------------------------------------------------------------------------
  // 第一条完整知识网络：细胞呼吸链（无 3D 模型）
  // ------------------------------------------------------------------------
  mitochondrion: {
    id: 'mitochondrion',
    nameZh: '线粒体',
    nameEn: 'Mitochondrion',
    typeZh: '细胞器',
    typeEn: 'Organelle',
    scale: 'organelle',
    summary: '线粒体是真核细胞中的双层膜细胞器，是细胞能量代谢的重要场所。',
    location: '存在于大多数真核细胞的细胞质中，能量需求高的细胞内数量更多。',
    coreFunctions: [
      '参与有氧能量代谢',
      '产生大量 ATP',
      '参与部分代谢和细胞调控过程',
    ],
    mechanism:
      '电子传递链利用营养物质氧化产生的高能电子，在内膜两侧建立质子梯度；ATP 合酶随后利用该梯度合成 ATP。',
    keyStructures: [
      { nameZh: '内膜', nameEn: 'Inner membrane' },
      { nameZh: '嵴', nameEn: 'Cristae' },
      { nameZh: '基质', nameEn: 'Matrix' },
    ],
    whyItMatters: '线粒体是连接氧气、细胞呼吸、电子传递链与 ATP 的能量工厂。',
    related: [
      relation('related_to', 'oxygen', '线粒体末端消耗氧气完成氧化磷酸化'),
      relation(
        'related_to',
        'cellular-respiration',
        '细胞呼吸的氧化磷酸化发生在线粒体',
      ),
      relation(
        'contains',
        'electron-transport-chain',
        '电子传递链位于线粒体内膜',
      ),
      relation('contains', 'atp-synthase', 'ATP 合酶位于线粒体内膜'),
      relation('produces', 'atp', '线粒体大量合成 ATP'),
    ],
    deeperScale: 'molecule',
  },

  'electron-transport-chain': {
    id: 'electron-transport-chain',
    nameZh: '电子传递链',
    nameEn: 'Electron transport chain',
    typeZh: '复合体系',
    typeEn: 'Protein complex',
    scale: 'molecule',
    summary:
      '电子传递链是线粒体内膜上的一组蛋白复合体，通过传递电子建立质子梯度。',
    location: '位于线粒体内膜上，由多个蛋白复合体依次排列。',
    coreFunctions: ['传递高能电子', '建立跨膜质子梯度', '最终把电子交给氧气'],
    mechanism:
      '电子在各复合体间依次传递，逐步释放能量并把质子泵入膜间隙，形成驱动 ATP 合成的质子梯度。',
    whyItMatters:
      '电子传递链把营养物质中的能量转化为可被 ATP 合酶利用的质子梯度。',
    related: [
      relation('related_to', 'mitochondrion', '电子传递链位于线粒体内膜'),
      relation('requires', 'oxygen', '氧气是电子传递链的末端电子受体'),
      relation('related_to', 'atp-synthase', '质子梯度由 ATP 合酶利用'),
      relation(
        'related_to',
        'cellular-respiration',
        '电子传递链是氧化磷酸化的核心环节',
      ),
    ],
    deeperScale: 'molecule',
  },

  'atp-synthase': {
    id: 'atp-synthase',
    nameZh: 'ATP合酶',
    nameEn: 'ATP synthase',
    typeZh: '酶',
    typeEn: 'Enzyme',
    scale: 'molecule',
    summary: 'ATP 合酶是利用质子梯度驱动的分子马达，催化 ADP 与磷酸合成 ATP。',
    location: '镶嵌在线粒体内膜上，跨膜分布。',
    coreFunctions: ['利用质子回流驱动自身旋转', '催化 ADP 与磷酸合成 ATP'],
    mechanism:
      '质子沿梯度回流穿过 ATP 合酶，驱动其转动并促使 ADP 与磷酸结合，从而生成 ATP。',
    whyItMatters: 'ATP 合酶是细胞把质子势能最终转化为可用能量 ATP 的关键机器。',
    related: [
      relation('related_to', 'mitochondrion', 'ATP 合酶位于线粒体内膜'),
      relation(
        'related_to',
        'electron-transport-chain',
        '电子传递链建立的质子梯度由 ATP 合酶利用',
      ),
      relation('produces', 'atp', 'ATP 合酶直接合成 ATP'),
      relation(
        'related_to',
        'cellular-respiration',
        'ATP 合酶完成氧化磷酸化的产能环节',
      ),
    ],
    deeperScale: 'molecule',
  },
};

/** 模型结构 id（如 "heart"）→ 知识节点 id（如 "heart"）。 */
export const modelNodeMap: Record<string, string> = {
  heart: 'heart',
  lungs: 'lungs',
  liver: 'liver',
  stomach: 'stomach',
  kidneys: 'kidneys',
  cerebrum: 'brain',
  cerebellum: 'brain',
  brainstem: 'brain',
};

export const scaleLabels: Array<{
  id: KnowledgeScale;
  en: string;
  zh: string;
  enabled: boolean;
}> = [
  { id: 'human', en: 'HUMAN', zh: '人体', enabled: true },
  { id: 'organ', en: 'ORGAN', zh: '器官', enabled: true },
  { id: 'tissue', en: 'TISSUE', zh: '组织', enabled: false },
  { id: 'cell', en: 'CELL', zh: '细胞', enabled: false },
  { id: 'organelle', en: 'ORGANELLE', zh: '细胞器', enabled: false },
  { id: 'molecule', en: 'MOLECULE', zh: '分子', enabled: false },
];
