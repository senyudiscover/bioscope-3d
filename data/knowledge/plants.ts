import { relation, type KnowledgeNode } from './anatomy';

// Plant Atlas v0.1：只建立本轮真实可访问的知识节点。
// ATP、氧气、线粒体、细胞呼吸等跨生命对象概念继续使用 anatomy.ts 中的稳定 ID。
export const plantKnowledgeNodes: Record<string, KnowledgeNode> = {
  'cell-wall': {
    id: 'cell-wall',
    nameZh: '细胞壁',
    nameEn: 'Cell wall',
    typeZh: '细胞结构',
    typeEn: 'Cellular structure',
    scale: 'cell',
    summary: '细胞壁位于植物细胞最外层，为细胞提供机械支持并帮助维持形态。',
    location: '位于细胞膜外侧。',
    coreFunctions: ['提供支撑', '限制细胞过度膨胀'],
    mechanism: '在本教学示意中，细胞壁表现为较厚的外层边界。',
    modelStructureIds: ['cell-wall'],
  },
  'cell-membrane': {
    id: 'cell-membrane',
    nameZh: '细胞膜',
    nameEn: 'Cell membrane',
    typeZh: '细胞结构',
    typeEn: 'Cellular structure',
    scale: 'cell',
    summary: '细胞膜是紧贴细胞壁内侧的选择性屏障。',
    location: '位于细胞壁内侧，包围细胞质和细胞器。',
    coreFunctions: ['分隔细胞内外环境', '选择性控制物质交换'],
    modelStructureIds: ['cell-membrane'],
  },
  cytoplasm: {
    id: 'cytoplasm',
    nameZh: '细胞质',
    nameEn: 'Cytoplasm',
    typeZh: '细胞组分',
    typeEn: 'Cell component',
    scale: 'cell',
    summary: '细胞质是细胞膜以内、细胞器周围的动态内部环境。',
    location: '在植物细胞中常被大型中央液泡挤压为靠近细胞外围的较薄区域。',
    coreFunctions: ['容纳细胞器', '为多种细胞活动提供内部环境'],
    modelStructureIds: ['cytoplasm'],
  },
  vacuole: {
    id: 'vacuole',
    nameZh: '中央液泡',
    nameEn: 'Central vacuole',
    typeZh: '细胞器',
    typeEn: 'Organelle',
    scale: 'organelle',
    summary: '成熟植物细胞的中央液泡通常占据细胞的大部分内部体积。',
    location: '位于细胞中央，并将细胞质和许多细胞器挤向细胞外围。',
    coreFunctions: ['维持细胞膨压', '储存水和部分溶质'],
    modelStructureIds: ['vacuole'],
  },
  nucleus: {
    id: 'nucleus',
    nameZh: '细胞核',
    nameEn: 'Nucleus',
    typeZh: '细胞器',
    typeEn: 'Organelle',
    scale: 'organelle',
    summary: '细胞核储存遗传信息并参与调控细胞活动。',
    location: '在植物细胞中常位于靠近细胞边缘的细胞质区域。',
    coreFunctions: ['储存遗传物质', '参与调控基因表达'],
    modelStructureIds: ['nucleus'],
  },
  spinach: {
    id: 'spinach',
    nameZh: '菠菜',
    nameEn: 'Spinach',
    typeZh: '植物',
    typeEn: 'Plant',
    scale: 'plant',
    summary:
      '菠菜是一种典型的 C3 植物。本图谱把它作为理解叶片结构、光合作用与细胞呼吸的教学入口。',
    location:
      '菠菜以莲座状叶片围绕短茎生长；本模型只保留与首阶段学习路径有关的主要结构。',
    coreFunctions: [
      '通过叶片获取光能和二氧化碳',
      '通过根与维管组织获取水和无机盐',
      '在细胞中同时进行光合作用与细胞呼吸',
    ],
    mechanism:
      '叶片中的叶肉细胞含有较多叶绿体，能捕获光能并参与形成有机物前体；细胞也利用线粒体进行细胞呼吸。',
    keyStructures: [
      { id: 'leaf', nameZh: '叶片', nameEn: 'Leaf', modelRef: 'leaf' },
      { nameZh: '叶柄', nameEn: 'Petiole' },
      { nameZh: '根', nameEn: 'Root' },
    ],
    whyItMatters:
      '菠菜把整株植物、器官、细胞和细胞器连接成一条可观察的多尺度学习路径。',
    related: [
      relation(
        'contains',
        'leaf',
        '菠菜的叶片是本图谱进入光合作用学习的主要入口',
      ),
      relation(
        'related_to',
        'photosynthesis',
        '菠菜叶片中的叶肉细胞可以进行光合作用',
      ),
      relation(
        'related_to',
        'cellular-respiration',
        '菠菜细胞也通过细胞呼吸获得可用的 ATP',
      ),
    ],
    modelStructureIds: ['spinach'],
    deeperScale: 'organ',
  },

  leaf: {
    id: 'leaf',
    nameZh: '叶片',
    nameEn: 'Leaf',
    typeZh: '植物器官',
    typeEn: 'Plant organ',
    scale: 'organ',
    summary:
      '叶片是菠菜进行光合作用和气体交换的主要器官，宽大的叶片有利于接收光。',
    location:
      '叶片通过叶柄连接植株；叶肉组织位于上下表皮之间，叶脉贯穿叶片内部。',
    coreFunctions: [
      '接收光',
      '与外界交换二氧化碳、氧气和水蒸气',
      '在叶肉细胞中进行光合作用',
    ],
    mechanism:
      '光穿过叶片表面进入叶肉，二氧化碳经气孔扩散到叶片内部，水则由维管组织输送到叶片。',
    keyStructures: [
      {
        id: 'mesophyll-cell',
        nameZh: '叶肉细胞',
        nameEn: 'Mesophyll cell',
        modelRef: 'mesophyll-cell',
      },
      { nameZh: '中脉', nameEn: 'Midrib' },
      { nameZh: '气孔', nameEn: 'Stoma' },
    ],
    whyItMatters:
      '叶片把外界的光、二氧化碳和水带到细胞尺度，是理解光合作用物质来源的关键。',
    related: [
      relation(
        'contains',
        'mesophyll-cell',
        '叶肉细胞构成叶片内部进行光合作用的重要组织',
      ),
      relation(
        'participates_in',
        'photosynthesis',
        '叶片是菠菜进行光合作用的主要器官',
      ),
      relation(
        'requires',
        'carbon-dioxide',
        '二氧化碳从外界进入叶片并参与碳固定',
      ),
    ],
    modelStructureIds: ['leaf'],
    deeperScale: 'cell',
  },

  'mesophyll-cell': {
    id: 'mesophyll-cell',
    nameZh: '叶肉细胞',
    nameEn: 'Mesophyll cell',
    typeZh: '植物细胞',
    typeEn: 'Plant cell',
    scale: 'cell',
    summary: '叶肉细胞是菠菜叶片内部的重要植物细胞，通常含有较多叶绿体。',
    location:
      '位于叶片上下表皮之间的叶肉组织中；本阶段用单个教学细胞展示其关键细胞器。',
    coreFunctions: [
      '利用叶绿体参与光合作用',
      '通过液泡维持细胞状态',
      '通过线粒体进行细胞呼吸',
    ],
    mechanism:
      '叶绿体参与捕获和转化光能，线粒体则利用有机物进行细胞呼吸；两类细胞器在同一植物细胞中协同存在。',
    keyStructures: [
      {
        id: 'chloroplast',
        nameZh: '叶绿体',
        nameEn: 'Chloroplast',
        modelRef: 'chloroplast',
      },
      {
        id: 'mitochondrion',
        nameZh: '线粒体',
        nameEn: 'Mitochondrion',
        modelRef: 'mitochondrion',
      },
      { nameZh: '细胞壁', nameEn: 'Cell wall' },
      { nameZh: '液泡', nameEn: 'Vacuole' },
      { nameZh: '细胞核', nameEn: 'Nucleus' },
    ],
    whyItMatters:
      '同时观察叶绿体和线粒体，可以避免把植物误解为只进行光合作用的生物。',
    related: [
      relation('contains', 'chloroplast', '叶肉细胞中通常含有较多叶绿体'),
      relation(
        'contains',
        'mitochondrion',
        '植物细胞也含有线粒体并进行细胞呼吸',
      ),
      relation(
        'participates_in',
        'photosynthesis',
        '叶肉细胞是叶片进行光合作用的重要细胞',
      ),
      relation(
        'participates_in',
        'cellular-respiration',
        '叶肉细胞同时进行细胞呼吸',
      ),
    ],
    modelStructureIds: ['mesophyll-cell'],
    deeperScale: 'organelle',
  },

  chloroplast: {
    id: 'chloroplast',
    nameZh: '叶绿体',
    nameEn: 'Chloroplast',
    typeZh: '细胞器',
    typeEn: 'Organelle',
    scale: 'organelle',
    summary: '叶绿体是植物和部分其他真核生物中进行光合作用的重要细胞器。',
    location: '在菠菜叶片的叶肉细胞中数量较多。',
    coreFunctions: [
      '捕获并转化光能',
      '参与形成 ATP 和 NADPH',
      '通过碳固定相关反应形成有机物前体',
    ],
    mechanism: '光反应主要发生在类囊体膜，卡尔文循环发生在叶绿体基质。',
    keyStructures: [
      { nameZh: '外膜', nameEn: 'Outer membrane' },
      { nameZh: '内膜', nameEn: 'Inner membrane' },
      { nameZh: '基质', nameEn: 'Stroma' },
      { id: 'thylakoid', nameZh: '类囊体', nameEn: 'Thylakoid' },
      { id: 'thylakoid', nameZh: '基粒', nameEn: 'Granum' },
    ],
    whyItMatters: '叶绿体连接光能、二氧化碳、水、氧气、ATP、糖类以及细胞呼吸。',
    related: [
      relation(
        'related_to',
        'photosynthesis',
        '叶绿体是植物光合作用的主要场所',
      ),
      relation('produces', 'atp', '光反应可以形成 ATP，随后用于碳固定相关反应'),
      relation(
        'related_to',
        'mitochondrion',
        '植物细胞既有叶绿体，也通过线粒体进行细胞呼吸',
      ),
      relation('produces', 'oxygen', '光合作用中的水氧化过程会释放氧气'),
      relation(
        'requires',
        'carbon-dioxide',
        '卡尔文循环利用二氧化碳形成有机物前体',
      ),
    ],
    modelStructureIds: ['chloroplast'],
  },

  thylakoid: {
    id: 'thylakoid',
    nameZh: '类囊体',
    nameEn: 'Thylakoid',
    typeZh: '膜性结构',
    typeEn: 'Membrane structure',
    scale: 'membrane',
    summary: '类囊体是叶绿体内部的扁平膜性结构，多个类囊体堆叠可以形成基粒。',
    location: '位于叶绿体基质中。类囊体膜分隔叶绿体基质与类囊体腔。',
    coreFunctions: [
      '组织光系统与电子传递组分',
      '在膜两侧建立质子梯度',
      '为 ATP 合酶提供工作界面',
    ],
    mechanism:
      '光反应主要发生在类囊体膜。电子传递过程促进类囊体膜两侧形成 H⁺电化学梯度，ATP 合酶随后利用该梯度促进 ATP 形成。',
    keyStructures: [
      { nameZh: '叶绿体基质', nameEn: 'Stroma' },
      { nameZh: '类囊体膜', nameEn: 'Thylakoid membrane' },
      { nameZh: '类囊体腔', nameEn: 'Thylakoid lumen' },
      { nameZh: '光系统', nameEn: 'Photosystem' },
      { id: 'atp-synthase', nameZh: 'ATP合酶', nameEn: 'ATP synthase' },
    ],
    whyItMatters:
      '类囊体把光吸收、电子传递、质子梯度和 ATP 形成组织在同一张膜上。',
    related: [
      relation(
        'participates_in',
        'light-reactions',
        '光反应主要发生在类囊体膜',
      ),
      relation(
        'contains',
        'electron-transport-chain',
        '类囊体膜承载光合作用中的电子传递过程',
      ),
      relation('contains', 'atp-synthase', '类囊体膜上存在 ATP 合酶'),
      relation('related_to', 'chloroplast', '类囊体位于叶绿体内部'),
    ],
    modelStructureIds: ['thylakoid'],
  },

  'light-reactions': {
    id: 'light-reactions',
    nameZh: '光反应',
    nameEn: 'Light reactions',
    typeZh: '光合作用阶段',
    typeEn: 'Photosynthetic process',
    scale: 'membrane',
    summary:
      '光反应利用光能推动电子转移，并形成 ATP 和 NADPH，同时水参与反应并释放氧气。',
    location: '主要发生在叶绿体类囊体膜。',
    coreFunctions: [
      '吸收光并推动电子转移',
      '建立跨类囊体膜的质子梯度',
      '形成 ATP 和 NADPH',
    ],
    mechanism:
      '光系统吸收光后推动电子转移；水提供电子并释放 O₂，电子传递建立质子梯度，ATP 合酶利用该梯度促进 ATP 形成。',
    whyItMatters:
      '光反应把光输入转化为后续碳固定可利用的 ATP 与还原力，并解释光合作用释放的氧气为何主要来自水。',
    related: [
      relation('related_to', 'thylakoid', '光反应主要发生在类囊体膜'),
      relation('produces', 'oxygen', '水参与光反应并释放氧气'),
      relation('produces', 'atp', '光反应可以形成 ATP'),
      relation(
        'related_to',
        'atp-synthase',
        'ATP 合酶利用质子梯度促进 ATP 形成',
      ),
      relation('related_to', 'photosynthesis', '光反应是光合作用的重要阶段'),
    ],
  },

  photosynthesis: {
    id: 'photosynthesis',
    nameZh: '光合作用',
    nameEn: 'Photosynthesis',
    typeZh: '代谢过程',
    typeEn: 'Metabolic process',
    scale: 'cell',
    summary:
      '光合作用把光能转化为化学能，并利用二氧化碳形成有机物前体，同时可释放氧气。',
    location:
      '植物细胞中，光反应主要发生在叶绿体类囊体膜，卡尔文循环发生在叶绿体基质。',
    coreFunctions: [
      '将光能转化并暂存于化学过程',
      '利用二氧化碳形成有机物前体',
      '水氧化过程中释放氧气',
    ],
    mechanism:
      '光反应形成 ATP 和 NADPH；卡尔文循环利用它们推动碳固定并形成 G3P 等有机物前体。二氧化碳并不是一步直接变成葡萄糖。',
    whyItMatters:
      '光合作用是理解生态系统能量输入、碳循环以及植物与其他生物关系的基础。',
    related: [
      relation('related_to', 'chloroplast', '叶绿体为光合作用提供空间组织'),
      relation('requires', 'carbon-dioxide', '二氧化碳为碳固定提供碳源'),
      relation('produces', 'oxygen', '释放的氧气主要来源于水的氧化'),
      relation('related_to', 'atp', '光反应形成的 ATP 用于后续碳固定相关反应'),
      relation(
        'related_to',
        'cellular-respiration',
        '两者紧密联系，但不是简单的正反过程',
      ),
    ],
  },
};
