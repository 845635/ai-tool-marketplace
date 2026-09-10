/* ===== AI工具超市 - 核心脚本 ===== */

// 全局数据存储
let allTools = [];
let categories = [];
let currentFilters = { category: 'all', pricing: 'all', search: '' };

// 渐变色板（用于工具logo）
const gradients = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#30cfd0', '#330867'],
  ['#a8edea', '#fed6e3'],
  ['#ff9a9e', '#fecfef'],
  ['#ffecd2', '#fcb69f'],
  ['#84fab0', '#8fd3f4'],
  ['#a18cd1', '#fbc2eb'],
  ['#fad0c4', '#ffd1ff'],
  ['#ffd89b', '#19547b'],
  ['#d299c2', '#fef9d7'],
  ['#89f7fe', '#66a6ff'],
  ['#fddb92', '#d1fdff'],
];

// 根据工具ID生成稳定的渐变色
function getGradient(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

// 获取工具名称首字（用于logo）
function getInitial(name) {
  return name.charAt(0).toUpperCase();
}

// 价格模式文本映射
const pricingMap = {
  free: { text: '免费', class: 'pricing-free' },
  freemium: { text: '免费+付费', class: 'pricing-freemium' },
  paid: { text: '付费', class: 'pricing-paid' }
};

// 获取分类名称
function getCategoryName(catId) {
  const cat = categories.find(c => c.id === catId);
  return cat ? cat.name : catId;
}

function getCategoryIcon(catId) {
  const cat = categories.find(c => c.id === catId);
  return cat ? cat.icon : '🔧';
}

// ===== 数据加载 =====
async function loadData() {
  try {
    const response = await fetch('data/tools.json');
    if (!response.ok) throw new Error('Failed to load data');
    const data = await response.json();
    allTools = data.tools || [];
    categories = data.categories || [];
    return true;
  } catch (e) {
    console.error('数据加载失败:', e);
    // 降级：尝试从全局变量加载（如果数据内联在页面中）
    if (typeof window.TOOLS_DATA !== 'undefined') {
      allTools = window.TOOLS_DATA.tools || [];
      categories = window.TOOLS_DATA.categories || [];
      return true;
    }
    return false;
  }
}

// ===== 工具卡片渲染 =====
function renderToolCard(tool) {
  const gradient = getGradient(tool.id);
  const pricing = pricingMap[tool.pricing] || pricingMap.freemium;
  const tags = (tool.tags || []).slice(0, 3).map(t => `<span class="tool-tag">${t}</span>`).join('');
  
  return `
    <div class="tool-card ${tool.featured ? 'featured' : ''}" onclick="openToolOfficial('${tool.id}')" title="点击访问 ${tool.name} 官网">
      <div class="tool-header">
        <div class="tool-logo" style="background: linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})">
          ${getInitial(tool.name)}
        </div>
        <div class="tool-info">
          <h3>${tool.name}</h3>
          <div class="tool-cat">${getCategoryIcon(tool.category)} ${getCategoryName(tool.category)}</div>
        </div>
      </div>
      <p class="tool-desc">${tool.description}</p>
      <div class="tool-tags">${tags}</div>
      <div class="tool-footer">
        <div class="tool-rating">⭐ ${tool.rating || '4.0'}</div>
        <span class="tool-pricing ${pricing.class}">${pricing.text}</span>
      </div>
    </div>
  `;
}

// 点击工具卡片直接跳转官网
function openToolOfficial(toolId) {
  const tool = allTools.find(t => t.id === toolId);
  if (tool && tool.official_url) {
    // 记录访问（消耗Token逻辑可在此扩展）
    recordToolAccess(tool);
    window.open(tool.official_url, '_blank', 'noopener');
  }
}

// ===== 筛选逻辑 =====
function getFilteredTools() {
  return allTools.filter(tool => {
    // 分类筛选
    if (currentFilters.category !== 'all' && tool.category !== currentFilters.category) {
      return false;
    }
    // 价格筛选
    if (currentFilters.pricing !== 'all' && tool.pricing !== currentFilters.pricing) {
      return false;
    }
    // 搜索筛选
    if (currentFilters.search) {
      const q = currentFilters.search.toLowerCase();
      const searchText = [
        tool.name,
        tool.name_en || '',
        tool.description,
        tool.full_description || '',
        (tool.tags || []).join(' '),
        getCategoryName(tool.category)
      ].join(' ').toLowerCase();
      if (!searchText.includes(q)) return false;
    }
    return true;
  });
}

// ===== 首页逻辑 =====
function initHomePage() {
  // 渲染分类
  const categoriesGrid = document.getElementById('categoriesGrid');
  if (categoriesGrid) {
    categoriesGrid.innerHTML = categories.map(cat => {
      const count = allTools.filter(t => t.category === cat.id).length;
      return `
        <div class="category-card" onclick="window.location.href='category.html?cat=${cat.id}'">
          <div class="category-icon">${cat.icon}</div>
          <div class="category-name">${cat.name}</div>
          <div class="category-count">${count} 款工具</div>
        </div>
      `;
    }).join('');
  }

  // 渲染热门工具
  const featuredGrid = document.getElementById('featuredGrid');
  if (featuredGrid) {
    const featured = allTools.filter(t => t.featured).slice(0, 6);
    featuredGrid.innerHTML = featured.map(renderToolCard).join('');
  }

  // 渲染全部工具
  renderAllTools();

  // 初始化AI工具轮盘
  initWheel();

  // 搜索框事件
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilters.search = e.target.value;
      renderAllTools();
    });
  }

  // 热门搜索词点击
  document.querySelectorAll('.search-hint span').forEach(el => {
    el.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = el.textContent;
        currentFilters.search = el.textContent;
        renderAllTools();
        document.getElementById('allTools').scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // 筛选标签
  document.querySelectorAll('.filter-tab[data-category]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab[data-category]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilters.category = tab.dataset.category;
      renderAllTools();
    });
  });

  // 价格筛选
  const pricingSelect = document.getElementById('pricingFilter');
  if (pricingSelect) {
    pricingSelect.addEventListener('change', (e) => {
      currentFilters.pricing = e.target.value;
      renderAllTools();
    });
  }
}

// ===== AI工具轮盘 =====
let wheelAngle = 0;
let wheelItems = [];
let wheelCurrentIndex = 0;

function initWheel() {
  const wheel = document.getElementById('aiWheel');
  if (!wheel || !allTools.length) return;

  // 选择16款代表工具：优先热门，再补充其余
  const featured = allTools.filter(t => t.featured);
  const rest = allTools.filter(t => !t.featured);
  wheelItems = [...featured.slice(0, 8), ...rest.slice(0, 8)];
  if (wheelItems.length < 16) {
    wheelItems = allTools.slice(0, 16);
  }
  wheelItems = wheelItems.slice(0, 16);

  const n = wheelItems.length;
  const radius = 40; // 百分比半径（相对轮盘圆心）

  wheel.innerHTML = wheelItems.map((tool, i) => {
    const angle = (360 / n) * i - 90; // 从顶部开始
    const rad = (angle * Math.PI) / 180;
    const x = 50 + radius * Math.cos(rad);
    const y = 50 + radius * Math.sin(rad);
    const grad = getGradient(tool.id);
    return `
      <div class="wheel-item" style="background: linear-gradient(135deg, ${grad[0]}, ${grad[1]}); left:${x.toFixed(2)}%; top:${y.toFixed(2)}%;" onclick="event.stopPropagation();openWheelTool(${i})" title="${tool.name}">
        <div class="wi-letter">${getInitial(tool.name)}</div>
        <div class="wi-name">${tool.name}</div>
      </div>
    `;
  }).join('');

  updateWheelCurrent();
}

function spinWheel(steps) {
  const wheel = document.getElementById('aiWheel');
  if (!wheel || !wheelItems.length) return;

  const n = wheelItems.length;
  const perItem = 360 / n;
  let targetAngle;

  if (steps === undefined) {
    // 随机旋转：随机选一个工具对准顶部
    wheelCurrentIndex = Math.floor(Math.random() * wheelItems.length);
    targetAngle = 360 * (5 + Math.floor(Math.random() * 3)) + (360 - perItem * wheelCurrentIndex);
  } else {
    // 指定步数旋转
    wheelCurrentIndex = ((wheelCurrentIndex + steps) % n + n) % n;
    targetAngle = 360 * 3 + (360 - perItem * wheelCurrentIndex);
  }

  wheelAngle = targetAngle;
  wheel.style.transform = `rotate(${targetAngle}deg)`;

  setTimeout(() => {
    updateWheelCurrent();
    const tool = wheelItems[wheelCurrentIndex];
    if (tool) showToast(`🎯 选中 ${tool.name}`, 'info');
  }, 1250);
}

function updateWheelCurrent() {
  const el = document.getElementById('wheelCurrent');
  if (el && wheelItems.length) {
    el.textContent = wheelItems[wheelCurrentIndex].name;
  }
}

function openWheelTool(index) {
  const tool = wheelItems[index];
  if (tool) {
    openToolOfficial(tool.id);
  }
}


function renderAllTools() {
  const grid = document.getElementById('allToolsGrid');
  const countEl = document.getElementById('resultCount');
  if (!grid) return;

  const filtered = getFilteredTools();
  
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <div class="icon">🔍</div>
        <h3>未找到相关工具</h3>
        <p>试试其他关键词或筛选条件</p>
      </div>
    `;
  } else {
    grid.innerHTML = filtered.map(renderToolCard).join('');
  }
  
  if (countEl) {
    countEl.textContent = `共 ${filtered.length} 款工具`;
  }
}

// ===== 分类页逻辑 =====
function initCategoryPage() {
  const params = new URLSearchParams(window.location.search);
  const catId = params.get('cat') || 'all';

  // 设置页面标题
  const cat = categories.find(c => c.id === catId);
  const pageTitle = document.getElementById('categoryTitle');
  const pageDesc = document.getElementById('categoryDesc');
  if (cat && pageTitle) {
    pageTitle.textContent = `${cat.icon} ${cat.name}`;
    if (pageDesc) pageDesc.textContent = cat.desc;
    document.title = `${cat.name} - AI工具超市`;
  } else if (pageTitle) {
    pageTitle.textContent = '全部工具';
    if (pageDesc) pageDesc.textContent = '浏览所有AI工具';
  }

  currentFilters.category = catId;

  // 渲染筛选标签
  const tabsContainer = document.getElementById('categoryTabs');
  if (tabsContainer) {
    let tabsHtml = `<button class="filter-tab ${catId === 'all' ? 'active' : ''}" data-cat="all">全部</button>`;
    categories.forEach(c => {
      tabsHtml += `<button class="filter-tab ${catId === c.id ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${c.name}</button>`;
    });
    tabsContainer.innerHTML = tabsHtml;

    tabsContainer.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetCat = tab.dataset.cat;
        if (targetCat === 'all') {
          window.location.href = 'category.html';
        } else {
          window.location.href = `category.html?cat=${targetCat}`;
        }
      });
    });
  }

  // 搜索
  const searchInput = document.getElementById('catSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilters.search = e.target.value;
      renderCategoryTools();
    });
  }

  renderCategoryTools();
}

function renderCategoryTools() {
  const grid = document.getElementById('categoryToolsGrid');
  const countEl = document.getElementById('categoryResultCount');
  if (!grid) return;

  const filtered = getFilteredTools();
  
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <div class="icon">🔍</div>
        <h3>未找到相关工具</h3>
        <p>试试其他关键词</p>
      </div>
    `;
  } else {
    grid.innerHTML = filtered.map(renderToolCard).join('');
  }
  
  if (countEl) {
    countEl.textContent = `共 ${filtered.length} 款工具`;
  }
}

// ===== 详情页逻辑 =====
function initDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const toolId = params.get('id');

  if (!toolId) {
    window.location.href = 'index.html';
    return;
  }

  const tool = allTools.find(t => t.id === toolId);
  if (!tool) {
    document.getElementById('detailContent').innerHTML = `
      <div class="empty-state">
        <div class="icon">😕</div>
        <h3>工具不存在</h3>
        <p>该工具可能已被移除或链接有误</p>
        <a href="index.html" class="btn btn-primary" style="margin-top:20px">返回首页</a>
      </div>
    `;
    return;
  }

  const gradient = getGradient(tool.id);
  const pricing = pricingMap[tool.pricing] || pricingMap.freemium;
  const cat = categories.find(c => c.id === tool.category);

  document.title = `${tool.name} - AI工具超市`;

  // 面包屑
  document.getElementById('breadcrumb').innerHTML = `
    <a href="index.html">首页</a>
    <span class="sep">/</span>
    <a href="category.html?cat=${tool.category}">${cat ? cat.name : ''}</a>
    <span class="sep">/</span>
    <span>${tool.name}</span>
  `;

  // 头部
  document.getElementById('detailHeader').innerHTML = `
    <div class="detail-logo" style="background: linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})">
      ${getInitial(tool.name)}
    </div>
    <div class="detail-info">
      <h1>${tool.name}</h1>
      <div class="detail-meta">
        <span class="cat-badge">${cat ? cat.icon + ' ' + cat.name : ''}</span>
        <span class="rating">⭐ ${tool.rating || '4.0'} 分</span>
        <span class="tool-pricing ${pricing.class}">${pricing.text}</span>
      </div>
      <p class="detail-desc">${tool.description}</p>
      <div class="detail-actions">
        <a href="${tool.official_url}" target="_blank" rel="noopener" class="btn btn-primary">
          🔗 访问官网
        </a>
        <a href="index.html" class="btn btn-outline">← 返回列表</a>
      </div>
    </div>
  `;

  // 主内容
  const featuresHtml = (tool.features || []).map(f => `<li>${f}</li>`).join('');
  document.getElementById('detailMain').innerHTML = `
    <h2>📝 详细介绍</h2>
    <p>${tool.full_description || tool.description}</p>
    
    <h2>✨ 核心功能</h2>
    <ul class="feature-list">${featuresHtml}</ul>
    
    <h2>💡 使用场景</h2>
    <p>${tool.name} 适用于${cat ? cat.name : 'AI工具'}相关场景，无论是个人创作者、团队协作还是企业级应用，都能找到合适的使用方式。通过其强大的AI能力，可以显著提升工作效率，降低创作门槛。</p>
  `;

  // 侧边栏
  const tagsHtml = (tool.tags || []).map(t => `<span class="tool-tag">${t}</span>`).join('');
  document.getElementById('detailSidebar').innerHTML = `
    <div class="sidebar-card">
      <h3>📋 基本信息</h3>
      <div class="info-row">
        <span class="label">工具名称</span>
        <span class="value">${tool.name}</span>
      </div>
      <div class="info-row">
        <span class="label">英文名称</span>
        <span class="value">${tool.name_en || '-'}</span>
      </div>
      <div class="info-row">
        <span class="label">所属分类</span>
        <span class="value">${cat ? cat.name : '-'}</span>
      </div>
      <div class="info-row">
        <span class="label">收费模式</span>
        <span class="value"><span class="tool-pricing ${pricing.class}">${pricing.text}</span></span>
      </div>
      <div class="info-row">
        <span class="label">价格详情</span>
        <span class="value">${tool.price_detail || '-'}</span>
      </div>
      <div class="info-row">
        <span class="label">用户评分</span>
        <span class="value">⭐ ${tool.rating || '4.0'}/5.0</span>
      </div>
      <div class="info-row">
        <span class="label">官方网站</span>
        <span class="value"><a href="${tool.official_url}" target="_blank" rel="noopener">访问 →</a></span>
      </div>
    </div>
    <div class="sidebar-card">
      <h3>🏷️ 相关标签</h3>
      <div class="sidebar-tags">${tagsHtml}</div>
    </div>
  `;

  // 相关推荐
  const related = allTools.filter(t => t.category === tool.category && t.id !== tool.id).slice(0, 3);
  if (related.length > 0) {
    document.getElementById('relatedTools').innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">🔗 相关推荐</h2>
          <p class="section-subtitle">同类别的其他优质工具</p>
        </div>
      </div>
      <div class="tools-grid">${related.map(renderToolCard).join('')}</div>
    `;
  }
}

// ===== 关于页逻辑 =====
function initAboutPage() {
  // 更新统计数据
  const stats = {
    tools: allTools.length,
    categories: categories.length,
    featured: allTools.filter(t => t.featured).length
  };
  
  const toolsStat = document.getElementById('statTools');
  const catStat = document.getElementById('statCategories');
  const featuredStat = document.getElementById('statFeatured');
  
  if (toolsStat) toolsStat.textContent = stats.tools + '+';
  if (catStat) catStat.textContent = stats.categories;
  if (featuredStat) featuredStat.textContent = stats.featured;
}

// ===== Token 充值系统 =====
const TOKEN_STORAGE_KEY = 'ai_marketplace_tokens';
const TOKEN_HISTORY_KEY = 'ai_marketplace_token_history';

// 充值套餐
const rechargePackages = [
  { id: 'p1', tokens: 100, price: 9.9, bonus: 0, label: '体验包' },
  { id: 'p2', tokens: 500, price: 39.9, bonus: 50, label: '基础包' },
  { id: 'p3', tokens: 1000, price: 69.9, bonus: 200, label: '标准包', popular: true },
  { id: 'p4', tokens: 3000, price: 179.9, bonus: 800, label: '高级包' },
  { id: 'p5', tokens: 10000, price: 499.9, bonus: 3000, label: '企业包' },
  { id: 'p6', tokens: 50000, price: 1999.9, bonus: 20000, label: '旗舰包' }
];

// 获取Token余额
function getTokenBalance() {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

// 设置Token余额
function setTokenBalance(amount) {
  localStorage.setItem(TOKEN_STORAGE_KEY, amount.toString());
  updateTokenDisplay();
}

// 增加Token
function addTokens(amount) {
  const current = getTokenBalance();
  setTokenBalance(current + amount);
  return current + amount;
}

// 消耗Token
function consumeTokens(amount) {
  const current = getTokenBalance();
  if (current < amount) {
    showToast('Token余额不足，请先充值', 'error');
    openRechargeModal();
    return false;
  }
  setTokenBalance(current - amount);
  return true;
}

// 记录工具访问（每次访问消耗1 Token，可配置）
function recordToolAccess(tool) {
  // 免费工具不消耗Token
  if (tool.pricing === 'free') return;
  // 每次访问消耗1 Token
  if (consumeTokens(1)) {
    console.log(`访问 ${tool.name}，消耗 1 Token`);
  }
}

// 更新导航栏Token显示
function updateTokenDisplay() {
  const balance = getTokenBalance();
  document.querySelectorAll('.token-amount').forEach(el => {
    el.textContent = balance.toLocaleString();
  });
}

// 打开充值弹窗
let selectedPackage = null;
let selectedPayment = 'wechat';

function openRechargeModal() {
  const modal = document.getElementById('rechargeModal');
  if (!modal) {
    createRechargeModal();
  }
  renderRechargeModal();
  document.getElementById('rechargeModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeRechargeModal() {
  const modal = document.getElementById('rechargeModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

// 创建充值弹窗DOM
function createRechargeModal() {
  const modalHtml = `
    <div class="modal-overlay" id="rechargeModal" onclick="if(event.target===this)closeRechargeModal()">
      <div class="modal">
        <div class="modal-header">
          <h2>💎 Token 充值</h2>
          <button class="modal-close" onclick="closeRechargeModal()">✕</button>
        </div>
        <div class="modal-body" id="rechargeModalBody">
          <!-- 动态渲染 -->
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 渲染充值弹窗内容
function renderRechargeModal() {
  const body = document.getElementById('rechargeModalBody');
  const balance = getTokenBalance();
  
  if (!selectedPackage) {
    selectedPackage = rechargePackages[2]; // 默认选标准包
  }
  
  const packagesHtml = rechargePackages.map(pkg => `
    <div class="package-card ${selectedPackage.id === pkg.id ? 'selected' : ''}" onclick="selectPackage('${pkg.id}')">
      ${pkg.popular ? '<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);padding:2px 10px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;font-size:10px;font-weight:700;border-radius:100px;white-space:nowrap;">🔥 热门</div>' : ''}
      <div class="package-tokens">${pkg.tokens.toLocaleString()} <span>Token</span></div>
      <div class="package-price">¥${pkg.price}</div>
      ${pkg.bonus > 0 ? `<div class="package-bonus">赠送 ${pkg.bonus.toLocaleString()} Token</div>` : ''}
    </div>
  `).join('');
  
  const totalTokens = selectedPackage.tokens + selectedPackage.bonus;
  
  body.innerHTML = `
    <div class="recharge-balance-info">
      <div>
        <div class="label">当前余额</div>
        <div class="amount">${balance.toLocaleString()} Token</div>
      </div>
      <div style="text-align:right">
        <div class="label">充值后余额</div>
        <div class="amount">${(balance + totalTokens).toLocaleString()}</div>
      </div>
    </div>
    
    <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;">选择套餐</h3>
    <div class="package-grid">${packagesHtml}</div>
    
    <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;">支付方式</h3>
    <div class="payment-methods">
      <div class="payment-method ${selectedPayment === 'wechat' ? 'selected' : ''}" onclick="selectPayment('wechat')">
        💚 微信支付
      </div>
      <div class="payment-method ${selectedPayment === 'alipay' ? 'selected' : ''}" onclick="selectPayment('alipay')">
        💙 支付宝
      </div>
    </div>
    
    <div class="payment-summary">
      <div class="row">
        <span>套餐</span>
        <span>${selectedPackage.label}（${selectedPackage.tokens.toLocaleString()} Token）</span>
      </div>
      ${selectedPackage.bonus > 0 ? `
      <div class="row">
        <span>赠送</span>
        <span style="color:#10b981">+${selectedPackage.bonus.toLocaleString()} Token</span>
      </div>` : ''}
      <div class="row">
        <span>支付方式</span>
        <span>${selectedPayment === 'wechat' ? '微信支付' : '支付宝'}</span>
      </div>
      <div class="row total">
        <span>实付金额</span>
        <span>¥${selectedPackage.price}</span>
      </div>
    </div>
    
    <div style="margin-top:20px">
      <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="processPayment()">
        立即支付 ¥${selectedPackage.price}
      </button>
      <p style="text-align:center;font-size:11px;color:var(--text-lighter);margin-top:12px;">
        支付即表示同意《用户服务协议》，Token一经充值不支持退款
      </p>
    </div>
  `;
}

function selectPackage(pkgId) {
  selectedPackage = rechargePackages.find(p => p.id === pkgId);
  renderRechargeModal();
}

function selectPayment(method) {
  selectedPayment = method;
  renderRechargeModal();
}

// 真实收款流程（扫码付款 → 联系站长确认 → 手动发放Token）
// 站长收款二维码：将你的微信/支付宝收款码图片分别命名为 wechat.png / alipay.png
// 放到网站目录的 qr/ 文件夹下即可生效（如：qr/wechat.png、qr/alipay.png）
// 站长联系方式（微信/QQ）：替换下方为你自己的联系方式
const STATION_CONTACT = {
  wechat: '你的微信号',
  qq: '你的QQ号',
  note: '付款后请发送付款截图，确认后Token手动到账'
};

function processPayment() {
  const body = document.getElementById('rechargeModalBody');
  const totalTokens = selectedPackage.tokens + selectedPackage.bonus;
  const isWechat = selectedPayment === 'wechat';
  const qrImg = isWechat ? 'qr/wechat.png' : 'qr/alipay.png';
  const payName = isWechat ? '微信' : '支付宝';
  
  body.innerHTML = `
    <div class="qr-pay-box">
      <div class="qr-pay-amount">¥${selectedPackage.price}</div>
      <div class="qr-pay-label">${selectedPackage.label} · ${totalTokens.toLocaleString()} Token ${selectedPackage.bonus > 0 ? `（含赠送 ${selectedPackage.bonus.toLocaleString()}）` : ''}</div>
      
      <div class="qr-image-wrap">
        <img src="${qrImg}" alt="${payName}收款码"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
        <div class="qr-placeholder" style="display:none">
          <div class="qr-big">${isWechat ? '💚' : '💙'}</div>
          <div>${payName}收款码</div>
          <div>站长尚未上传收款码</div>
        </div>
      </div>
      
      <div class="qr-tip">
        ⚠️ 请使用<b>${payName}</b>扫描上方二维码，支付 <b>¥${selectedPackage.price}</b><br>
        付款成功后点击下方"我已付款"，并联系站长发送<b>付款截图</b>，确认后Token将手动到账。
      </div>
      
      <div style="margin-top:18px">
        <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="confirmPaid()">
          ✅ 我已付款，等待Token到账
        </button>
        <button class="btn btn-outline" style="width:100%;justify-content:center;margin-top:10px" onclick="renderRechargeModal()">
          ← 返回重新选择
        </button>
      </div>
      
      <div class="qr-contact">
        联系站长：<b>${STATION_CONTACT.wechat}</b>（微信） / <b>${STATION_CONTACT.qq}</b>（QQ）
      </div>
    </div>
  `;
}

// 确认已付款
function confirmPaid() {
  const body = document.getElementById('rechargeModalBody');
  body.innerHTML = `
    <div style="text-align:center;padding:40px 20px">
      <div style="font-size:56px;margin-bottom:12px">📩</div>
      <h3>订单已提交</h3>
      <p style="font-size:13px;color:var(--text-light);margin:12px 0 6px">请将<b>付款截图</b>发送给站长（${STATION_CONTACT.wechat}）确认</p>
      <p style="font-size:13px;color:var(--text-light);margin-bottom:6px">确认到账后，Token将立即发放到你的账户</p>
      <p style="font-size:12px;color:#fbbf24;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:8px;padding:8px 12px;margin:10px auto;max-width:320px">
        💡 到账后请刷新页面查看余额
      </p>
      <button class="btn btn-primary" style="margin-top:20px" onclick="closeRechargeModal()">
        完成
      </button>
    </div>
  `;
  showToast('订单已提交，请发送付款截图联系站长确认', 'warning');
}

// 记录交易历史
function recordTransaction(type, amount, price) {
  const history = JSON.parse(localStorage.getItem(TOKEN_HISTORY_KEY) || '[]');
  history.unshift({
    type,
    amount,
    price,
    time: new Date().toISOString(),
    balanceAfter: getTokenBalance()
  });
  localStorage.setItem(TOKEN_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

// ===== Toast 提示 =====
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== 通用功能 =====
function initCommon() {
  // 初始化Token显示
  updateTokenDisplay();
  
  // 充值按钮事件
  document.querySelectorAll('.token-recharge-btn, .token-balance').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openRechargeModal();
    });
  });
  
  // 回到顶部按钮
  const backBtn = document.createElement('button');
  backBtn.className = 'back-to-top';
  backBtn.innerHTML = '↑';
  backBtn.setAttribute('aria-label', '回到顶部');
  document.body.appendChild(backBtn);

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      backBtn.classList.add('visible');
    } else {
      backBtn.classList.remove('visible');
    }
  });

  backBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 移动端菜单（简单实现）
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      if (navLinks.style.display === 'flex') {
        navLinks.style.display = '';
      } else {
        navLinks.style.display = 'flex';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '64px';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.background = 'white';
        navLinks.style.flexDirection = 'column';
        navLinks.style.padding = '16px';
        navLinks.style.borderBottom = '1px solid var(--border)';
        navLinks.style.boxShadow = 'var(--shadow)';
      }
    });
  }
}


// ===== Coze风格工作台 - 工作流编辑器 =====
const WORKFLOW_STORAGE_KEY = 'ai_marketplace_workflows';

// 节点类型定义（借鉴Coze设计）
const nodeTypes = {
  // ===== 基础节点 =====
  start: {
    name: '开始', icon: '▶️', color: '#10b981', group: 'basic',
    hasInput: false, hasOutput: true,
    desc: '工作流入口，定义初始变量',
    inputs: [],
    outputs: [{ name: 'output', type: 'object', desc: '初始输出' }]
  },
  end: {
    name: '结束', icon: '⏹️', color: '#ef4444', group: 'basic',
    hasInput: true, hasOutput: false,
    desc: '工作流结束，返回最终结果',
    inputs: [{ name: 'input', type: 'any', desc: '最终结果' }],
    outputs: []
  },
  input: {
    name: '数据输入', icon: '📥', color: '#06b6d4', group: 'basic',
    hasInput: false, hasOutput: true,
    desc: '定义工作流输入参数',
    inputs: [],
    outputs: [{ name: 'data', type: 'string', desc: '输入数据' }]
  },
  output: {
    name: '结果输出', icon: '📤', color: '#f97316', group: 'basic',
    hasInput: true, hasOutput: false,
    desc: '输出节点结果',
    inputs: [{ name: 'input', type: 'any', desc: '要输出的数据' }],
    outputs: []
  },

  // ===== 逻辑控制节点 =====
  condition: {
    name: '条件判断', icon: '🔀', color: '#14b8a6', group: 'logic',
    hasInput: true, hasOutput: true,
    desc: 'If/Else条件分支，满足条件走不同路径',
    inputs: [{ name: 'input', type: 'any', desc: '判断输入' }],
    outputs: [
      { name: 'true', type: 'any', desc: '条件为真时输出' },
      { name: 'false', type: 'any', desc: '条件为假时输出' }
    ]
  },
  switch: {
    name: '分支选择', icon: '🔱', color: '#0ea5e9', group: 'logic',
    hasInput: true, hasOutput: true,
    desc: 'Switch多分支，根据值匹配不同分支',
    inputs: [{ name: 'input', type: 'string', desc: '判断值' }],
    outputs: [{ name: 'matched', type: 'any', desc: '匹配分支输出' }]
  },
  loop: {
    name: '循环执行', icon: '🔄', color: '#8b5cf6', group: 'logic',
    hasInput: true, hasOutput: true,
    desc: 'For Each循环，遍历数组逐项处理',
    inputs: [{ name: 'items', type: 'array', desc: '要遍历的数组' }],
    outputs: [{ name: 'result', type: 'array', desc: '处理结果数组' }]
  },
  variable: {
    name: '变量赋值', icon: '📦', color: '#64748b', group: 'logic',
    hasInput: true, hasOutput: true,
    desc: '设置或修改变量值',
    inputs: [{ name: 'input', type: 'any', desc: '输入值' }],
    outputs: [{ name: 'value', type: 'any', desc: '变量值' }]
  },
  delay: {
    name: '延时等待', icon: '⏱️', color: '#f59e0b', group: 'logic',
    hasInput: true, hasOutput: true,
    desc: '延时指定时间后继续执行',
    inputs: [{ name: 'input', type: 'any', desc: '输入' }],
    outputs: [{ name: 'output', type: 'any', desc: '输出' }]
  },

  // ===== AI能力节点（10大分类） =====
  ai_chat: {
    name: 'AI对话', icon: '💬', color: '#6366f1', group: 'ai', category: 'chat',
    hasInput: true, hasOutput: true,
    desc: '调用大语言模型进行对话',
    inputs: [
      { name: 'prompt', type: 'string', desc: '用户提问' },
      { name: 'system', type: 'string', desc: '系统提示词' }
    ],
    outputs: [
      { name: 'answer', type: 'string', desc: 'AI回答' },
      { name: 'usage', type: 'object', desc: 'Token用量' }
    ]
  },
  ai_image: {
    name: 'AI绘画', icon: '🎨', color: '#ec4899', group: 'ai', category: 'image',
    hasInput: true, hasOutput: true,
    desc: 'AI图像生成',
    inputs: [{ name: 'prompt', type: 'string', desc: '图像描述' }],
    outputs: [{ name: 'image_url', type: 'string', desc: '生成图片URL' }]
  },
  ai_music: {
    name: 'AI音乐', icon: '🎵', color: '#f59e0b', group: 'ai', category: 'music',
    hasInput: true, hasOutput: true,
    desc: 'AI音乐生成',
    inputs: [{ name: 'prompt', type: 'string', desc: '音乐描述' }],
    outputs: [{ name: 'audio_url', type: 'string', desc: '生成音频URL' }]
  },
  ai_writing: {
    name: 'AI写作', icon: '✍️', color: '#8b5cf6', group: 'ai', category: 'writing',
    hasInput: true, hasOutput: true,
    desc: 'AI文案写作',
    inputs: [{ name: 'topic', type: 'string', desc: '写作主题' }],
    outputs: [{ name: 'content', type: 'string', desc: '生成内容' }]
  },
  ai_coding: {
    name: 'AI编程', icon: '💻', color: '#10b981', group: 'ai', category: 'coding',
    hasInput: true, hasOutput: true,
    desc: 'AI代码生成',
    inputs: [{ name: 'requirement', type: 'string', desc: '需求描述' }],
    outputs: [{ name: 'code', type: 'string', desc: '生成代码' }]
  },
  ai_video: {
    name: 'AI视频', icon: '🎬', color: '#ef4444', group: 'ai', category: 'video',
    hasInput: true, hasOutput: true,
    desc: 'AI视频生成',
    inputs: [{ name: 'prompt', type: 'string', desc: '视频描述' }],
    outputs: [{ name: 'video_url', type: 'string', desc: '生成视频URL' }]
  },
  ai_office: {
    name: 'AI办公', icon: '📊', color: '#06b6d4', group: 'ai', category: 'office',
    hasInput: true, hasOutput: true,
    desc: 'AI办公效率',
    inputs: [{ name: 'document', type: 'string', desc: '文档内容' }],
    outputs: [{ name: 'result', type: 'string', desc: '处理结果' }]
  },
  ai_design: {
    name: 'AI设计', icon: '🖌️', color: '#d946ef', group: 'ai', category: 'design',
    hasInput: true, hasOutput: true,
    desc: 'AI设计辅助',
    inputs: [{ name: 'requirement', type: 'string', desc: '设计需求' }],
    outputs: [{ name: 'design', type: 'string', desc: '设计结果' }]
  },
  ai_education: {
    name: 'AI教育', icon: '📚', color: '#84cc16', group: 'ai', category: 'education',
    hasInput: true, hasOutput: true,
    desc: 'AI教育辅导',
    inputs: [{ name: 'question', type: 'string', desc: '问题' }],
    outputs: [{ name: 'answer', type: 'string', desc: '解答' }]
  },
  ai_data: {
    name: 'AI数据分析', icon: '📈', color: '#0ea5e9', group: 'ai', category: 'data',
    hasInput: true, hasOutput: true,
    desc: 'AI数据分析',
    inputs: [{ name: 'data', type: 'string', desc: '数据' }],
    outputs: [{ name: 'analysis', type: 'string', desc: '分析结果' }]
  },

  // ===== 工具节点 =====
  code: {
    name: '代码执行', icon: '🧑‍💻', color: '#f59e0b', group: 'tool',
    hasInput: true, hasOutput: true,
    desc: '运行自定义JS/Python代码',
    inputs: [{ name: 'input', type: 'any', desc: '输入变量' }],
    outputs: [{ name: 'output', type: 'any', desc: '代码输出' }]
  },
  http_request: {
    name: 'HTTP请求', icon: '🌐', color: '#0ea5e9', group: 'tool',
    hasInput: true, hasOutput: true,
    desc: '调用外部API接口',
    inputs: [{ name: 'params', type: 'object', desc: '请求参数' }],
    outputs: [
      { name: 'response', type: 'object', desc: '响应数据' },
      { name: 'status', type: 'number', desc: '状态码' }
    ]
  },
  knowledge: {
    name: '知识库检索', icon: '📖', color: '#10b981', group: 'tool',
    hasInput: true, hasOutput: true,
    desc: 'RAG知识库检索（需配置知识库）',
    inputs: [{ name: 'query', type: 'string', desc: '检索查询' }],
    outputs: [{ name: 'documents', type: 'array', desc: '检索到的文档' }]
  },
  plugin: {
    name: '插件调用', icon: '🔌', color: '#8b5cf6', group: 'tool',
    hasInput: true, hasOutput: true,
    desc: '调用第三方插件/API',
    inputs: [{ name: 'input', type: 'any', desc: '插件输入' }],
    outputs: [{ name: 'output', type: 'any', desc: '插件输出' }]
  },
  database: {
    name: '数据库操作', icon: '🗄️', color: '#64748b', group: 'tool',
    hasInput: true, hasOutput: true,
    desc: '数据库增删改查',
    inputs: [{ name: 'query', type: 'string', desc: 'SQL/查询条件' }],
    outputs: [{ name: 'result', type: 'array', desc: '查询结果' }]
  },
  text_process: {
    name: '文本处理', icon: '📝', color: '#14b8a6', group: 'tool',
    hasInput: true, hasOutput: true,
    desc: '文本模板、替换、提取、格式化',
    inputs: [{ name: 'text', type: 'string', desc: '输入文本' }],
    outputs: [{ name: 'result', type: 'string', desc: '处理结果' }]
  },
  message: {
    name: '消息通知', icon: '🔔', color: '#ef4444', group: 'tool',
    hasInput: true, hasOutput: true,
    desc: '发送消息通知（邮件/短信/Webhook）',
    inputs: [{ name: 'content', type: 'string', desc: '消息内容' }],
    outputs: [{ name: 'status', type: 'string', desc: '发送状态' }]
  },
  note: {
    name: '注释说明', icon: '📌', color: '#94a3b8', group: 'tool',
    hasInput: false, hasOutput: false,
    desc: '添加注释说明，不参与执行',
    inputs: [],
    outputs: []
  }
};

// 工作流状态
let workflowState = {
  name: '未命名工作流',
  nodes: [],
  connections: [],
  selectedNodeId: null,
  selectedConnId: null,
  nextNodeId: 1,
  zoom: 1,
  panX: 0,
  panY: 0,
  debugMode: false,
  testData: {}
};

// 运行时状态
let runtimeState = {
  isRunning: false,
  currentNodeId: null,
  nodeResults: {},
  variables: {},
  executionOrder: []
};

let isDraggingNode = false;
let dragOffset = { x: 0, y: 0 };
let isConnecting = false;
let connectionStart = null;
let connectionStartPort = null;
let tempLine = null;
let isPanning = false;
let panStart = { x: 0, y: 0 };

// ===== 变量引用系统 =====
// 解析 {{节点ID.变量名}} 语法
function parseVariables(text, nodeResults) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, nodeId, varName) => {
    const nid = parseInt(nodeId.replace(/\D/g, ''));
    if (nodeResults[nid] && nodeResults[nid][varName] !== undefined) {
      return nodeResults[nid][varName];
    }
    return match;
  });
}

// 获取节点可用变量列表（用于变量插入）
function getAvailableVariables(currentNodeId) {
  const vars = [];
  workflowState.nodes.forEach(node => {
    if (node.id === currentNodeId) return;
    const nt = nodeTypes[node.type];
    if (nt && nt.outputs) {
      nt.outputs.forEach(out => {
        vars.push({
          label: `${nt.name} - ${out.name}`,
          value: `{{${node.id}.${out.name}}}`,
          nodeId: node.id,
          varName: out.name,
          type: out.type,
          desc: out.desc
        });
      });
    }
  });
  return vars;
}

// ===== 工作台初始化 =====
function initWorkbenchPage() {
  loadWorkflowsList();
  renderNodePanel();
  setupCanvasEvents();
  setupToolbarEvents();
  setupKeyboardShortcuts();

  // 加载默认工作流或新建
  const saved = localStorage.getItem('ai_marketplace_current_workflow');
  if (saved) {
    try {
      workflowState = { ...workflowState, ...JSON.parse(saved) };
      document.getElementById('workflowNameInput').value = workflowState.name;
    } catch(e) {
      createNewWorkflow();
    }
  } else {
    createNewWorkflow();
  }

  renderWorkflow();
  updatePropertyPanel();
  updateZoomDisplay();
}

// ===== 新建工作流 =====
function createNewWorkflow() {
  const chatTools = allTools.filter(t => t.category === 'chat');
  const defaultTool = chatTools.length > 0 ? chatTools[0].name : 'ChatGPT';

  workflowState = {
    name: '未命名工作流 ' + (new Date().getMonth()+1) + '/' + new Date().getDate(),
    nodes: [
      { id: 1, type: 'start', x: 80, y: 200, config: {} },
      { id: 2, type: 'ai_chat', x: 380, y: 200, config: { tool: defaultTool, prompt: '你好，请介绍一下你自己', temperature: 0.7, system: '你是一个 helpful 的AI助手' } },
      { id: 3, type: 'output', x: 680, y: 200, config: { format: 'text' } }
    ],
    connections: [
      { id: 'c1', from: 1, fromPort: 'output', to: 2, toPort: 'prompt', condition: '' },
      { id: 'c2', from: 2, fromPort: 'answer', to: 3, toPort: 'input', condition: '' }
    ],
    selectedNodeId: null,
    selectedConnId: null,
    nextNodeId: 4,
    zoom: 1,
    panX: 0,
    panY: 0,
    debugMode: false,
    testData: {}
  };
  runtimeState = { isRunning: false, currentNodeId: null, nodeResults: {}, variables: {}, executionOrder: [] };

  document.getElementById('workflowNameInput').value = workflowState.name;
  renderWorkflow();
  updatePropertyPanel();
  showToast('已创建新工作流', 'success');
}

// ===== 节点面板渲染 =====
function renderNodePanel() {
  const panel = document.getElementById('nodePanel');
  if (!panel) return;

  const groups = { basic: [], logic: [], ai: [], tool: [] };
  for (const [typeId, nt] of Object.entries(nodeTypes)) {
    groups[nt.group]?.push(typeId);
  }

  const groupLabels = {
    basic: { name: '🔧 基础节点', color: '#10b981' },
    logic: { name: '🔀 逻辑控制', color: '#8b5cf6' },
    ai: { name: '🤖 AI能力', color: '#6366f1' },
    tool: { name: '🛠️ 工具节点', color: '#f59e0b' }
  };

  let html = '';
  for (const [groupKey, label] of Object.entries(groupLabels)) {
    const types = groups[groupKey] || [];
    if (types.length === 0) continue;
    html += `<h3 style="color:${label.color};border-left:3px solid ${label.color};padding-left:8px">${label.name}</h3>`;
    types.forEach(typeId => {
      const nt = nodeTypes[typeId];
      const toolCount = nt.category ? allTools.filter(t => t.category === nt.category).length : null;
      html += `
        <div class="node-item" draggable="true" data-type="${typeId}" title="${nt.desc}">
          <div class="node-icon" style="background:${nt.color}20;color:${nt.color}">${nt.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:4px">
              ${nt.name}
              ${toolCount ? `<span style="font-size:10px;padding:1px 5px;background:var(--bg);border-radius:100px;color:var(--text-lighter);flex-shrink:0">${toolCount}款</span>` : ''}
            </div>
            <div style="font-size:10px;color:var(--text-lighter);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nt.desc}</div>
          </div>
        </div>
      `;
    });
  }
  panel.innerHTML = html;

  panel.querySelectorAll('.node-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('nodeType', item.dataset.type);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
}

// ===== 画布事件 =====
function setupCanvasEvents() {
  const canvas = document.getElementById('workflowCanvas');
  const container = document.getElementById('workflowCanvasContainer');
  if (!canvas || !container) return;

  // 拖放节点
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('nodeType');
    if (!nodeType) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left + container.scrollLeft) / workflowState.zoom - 100;
    const y = (e.clientY - rect.top + container.scrollTop) / workflowState.zoom - 40;
    addNode(nodeType, x, y);
  });

  // 点击空白取消选中
  canvas.addEventListener('click', (e) => {
    if (e.target === canvas || e.target.tagName === 'svg' || e.target.tagName === 'path') {
      workflowState.selectedNodeId = null;
      workflowState.selectedConnId = null;
      renderWorkflow();
      updatePropertyPanel();
    }
  });

  // 缩放（Ctrl+滚轮）
  container.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.3, Math.min(2, workflowState.zoom + delta));
      workflowState.zoom = newZoom;
      applyCanvasTransform();
      updateZoomDisplay();
    }
  }, { passive: false });

  // 平移（拖拽空白处，中键或空格+左键）
  let spacePressed = false;
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
      spacePressed = true;
      container.style.cursor = 'grab';
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spacePressed = false;
      container.style.cursor = '';
    }
  });

  container.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (spacePressed && e.button === 0)) {
      isPanning = true;
      panStart = { x: e.clientX - workflowState.panX, y: e.clientY - workflowState.panY };
      container.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isPanning) {
      workflowState.panX = e.clientX - panStart.x;
      workflowState.panY = e.clientY - panStart.y;
      applyCanvasTransform();
    }
    if (isConnecting && tempLine) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left + container.scrollLeft - workflowState.panX) / workflowState.zoom;
      const y = (e.clientY - rect.top + container.scrollTop - workflowState.panY) / workflowState.zoom;
      updateTempLine(x, y);
    }
  });

  document.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      container.style.cursor = spacePressed ? 'grab' : '';
    }
    if (isConnecting) {
      isConnecting = false;
      connectionStart = null;
      if (tempLine) { tempLine.remove(); tempLine = null; }
    }
  });
}

// 应用画布变换（缩放+平移）
function applyCanvasTransform() {
  const canvas = document.getElementById('workflowCanvas');
  if (canvas) {
    canvas.style.transform = `translate(${workflowState.panX}px, ${workflowState.panY}px) scale(${workflowState.zoom})`;
    canvas.style.transformOrigin = '0 0';
  }
}

// 更新缩放显示
function updateZoomDisplay() {
  const el = document.getElementById('zoomDisplay');
  if (el) el.textContent = Math.round(workflowState.zoom * 100) + '%';
}

// 缩放控制
function zoomCanvas(delta) {
  workflowState.zoom = Math.max(0.3, Math.min(2, workflowState.zoom + delta));
  applyCanvasTransform();
  updateZoomDisplay();
}

function resetCanvasView() {
  workflowState.zoom = 1;
  workflowState.panX = 0;
  workflowState.panY = 0;
  applyCanvasTransform();
  updateZoomDisplay();
}

// ===== 键盘快捷键 =====
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Delete/Backspace删除选中节点
    if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.matches('input, textarea, select')) {
      if (workflowState.selectedNodeId) {
        e.preventDefault();
        deleteSelectedNode();
      }
      if (workflowState.selectedConnId) {
        e.preventDefault();
        deleteConnection(workflowState.selectedConnId);
      }
    }
    // Ctrl+S保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveWorkflowToList();
    }
    // Ctrl+Z撤销（简单实现：重新加载）
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      // 可扩展完整撤销栈
    }
  });
}

// ===== 添加节点 =====
function addNode(type, x, y) {
  const node = {
    id: workflowState.nextNodeId++,
    type: type,
    x: Math.max(0, x),
    y: Math.max(0, y),
    config: getDefaultConfig(type)
  };
  workflowState.nodes.push(node);
  workflowState.selectedNodeId = node.id;
  workflowState.selectedConnId = null;
  renderWorkflow();
  updatePropertyPanel();
  showToast(`已添加${nodeTypes[type].name}节点`, 'success');
}

// ===== 默认配置 =====
function getDefaultConfig(type) {
  const nt = nodeTypes[type];
  if (nt && nt.category) {
    const tools = allTools.filter(t => t.category === nt.category);
    const defaultTool = tools.length > 0 ? tools[0].name : '';
    const base = { tool: defaultTool, prompt: '', temperature: 0.7 };
    switch(type) {
      case 'ai_image': return { ...base, style: '写实', size: '1024x1024' };
      case 'ai_music': return { ...base, style: '流行', duration: 30 };
      case 'ai_writing': return { ...base, style: '专业', length: '中等' };
      case 'ai_video': return { ...base, duration: 5, resolution: '1080p' };
      case 'ai_coding': return { ...base, language: 'JavaScript' };
      case 'ai_office': return { ...base, task: '文档总结' };
      case 'ai_design': return { ...base, style: '现代', format: 'PNG' };
      case 'ai_education': return { ...base, subject: '通用', level: '初级' };
      case 'ai_data': return { ...base, chartType: '柱状图' };
      default: return base;
    }
  }
  switch(type) {
    case 'input': return { data: '', varName: 'input' };
    case 'output': return { format: 'text' };
    case 'variable': return { name: '', value: '', operation: 'set' };
    case 'condition': return { condition: '', operator: 'contains', left: '', right: '' };
    case 'switch': return { value: '', cases: [{ match: '', output: '' }] };
    case 'loop': return { array: '', itemVar: 'item' };
    case 'delay': return { duration: 1000 };
    case 'code': return { language: 'javascript', code: '// 输入: input\nreturn input;' };
    case 'http_request': return { url: '', method: 'GET', headers: '', body: '' };
    case 'knowledge': return { knowledgeId: '', topK: 5 };
    case 'plugin': return { pluginId: '', params: '' };
    case 'database': return { operation: 'query', sql: '' };
    case 'text_process': return { operation: 'template', template: '', pattern: '', replacement: '' };
    case 'message': return { channel: 'webhook', content: '', target: '' };
    case 'note': return { text: '注释说明' };
    default: return {};
  }
}

// ===== 节点配置预览 =====
function getNodeConfigPreview(node) {
  const config = node.config || {};
  const nt = nodeTypes[node.type];
  if (nt && nt.category) {
    let preview = config.tool ? `🔧 ${config.tool}` : '未选择工具';
    if (config.prompt) preview += ` | ${config.prompt.substring(0, 20)}...`;
    return preview;
  }
  switch(node.type) {
    case 'input': return config.varName ? `变量: ${config.varName}` : (config.data ? `输入: ${config.data.substring(0, 20)}...` : '');
    case 'output': return `格式: ${config.format || 'text'}`;
    case 'variable': return config.name ? `${config.operation === 'set' ? '设置' : '追加'}: ${config.name}` : '';
    case 'condition': return config.condition ? `条件: ${config.condition}` : (config.left ? `${config.left} ${config.operator} ${config.right}` : '');
    case 'switch': return config.value ? `判断: ${config.value}` : '';
    case 'loop': return 'For Each 循环';
    case 'delay': return `延时 ${config.duration || 1000}ms`;
    case 'code': return `${config.language || 'js'} 代码`;
    case 'http_request': return config.url ? `${config.method || 'GET'} ${config.url.substring(0, 25)}...` : '';
    case 'knowledge': return '知识库检索';
    case 'plugin': return '插件调用';
    case 'database': return `${config.operation || 'query'} 操作`;
    case 'text_process': return `${config.operation || 'template'} 处理`;
    case 'message': return `${config.channel || 'webhook'} 通知`;
    case 'note': return config.text ? config.text.substring(0, 20) : '注释';
    default: return '';
  }
}

// ===== 渲染工作流 =====
function renderWorkflow() {
  const canvas = document.getElementById('workflowCanvas');
  if (!canvas) return;

  let nodesHtml = '';
  workflowState.nodes.forEach(node => {
    const nt = nodeTypes[node.type];
    if (!nt) return;
    const isSelected = workflowState.selectedNodeId === node.id;
    const configPreview = getNodeConfigPreview(node);
    const isRunning = runtimeState.currentNodeId === node.id;
    const isCompleted = runtimeState.nodeResults[node.id] !== undefined;
    const hasError = runtimeState.nodeResults[node.id]?.error;

    nodesHtml += `
      <div class="workflow-node ${isSelected ? 'selected' : ''} ${isRunning ? 'running' : ''} ${isCompleted ? 'completed' : ''} ${hasError ? 'error' : ''}" data-node-id="${node.id}" style="left:${node.x}px;top:${node.y}px">
        ${nt.hasInput ? nt.inputs.map((inp, i) => `<div class="node-port input" data-node-id="${node.id}" data-port="${inp.name}" data-port-index="${i}" style="top:${30 + i * 20}px" title="${inp.name}: ${inp.desc}"></div>`).join('') : ''}
        ${nt.hasOutput ? nt.outputs.map((out, i) => `<div class="node-port output" data-node-id="${node.id}" data-port="${out.name}" data-port-index="${i}" style="top:${30 + i * 20}px" title="${out.name}: ${out.desc}"></div>`).join('') : ''}
        <div class="workflow-node-header" style="background:${nt.color}10">
          <div class="node-icon" style="background:${nt.color}20;color:${nt.color}">${nt.icon}</div>
          <div class="node-title">${nt.name}</div>
          <span class="node-status" id="node-status-${node.id}"></span>
        </div>
        <div class="workflow-node-body">
          <div class="node-config-preview">${configPreview || '点击配置参数'}</div>
        </div>
        ${node.type === 'note' ? `<div class="note-content" style="padding:8px 12px;font-size:12px;color:var(--text-light);background:#fef9c3;border-radius:0 0 10px 10px;white-space:pre-wrap">${config.text || ''}</div>` : ''}
      </div>
    `;
  });

  canvas.innerHTML = `
    <svg class="workflow-svg" id="workflowSvg">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
        </marker>
        <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
        </marker>
      </defs>
    </svg>
    ${nodesHtml}
  `;

  renderConnections();
  bindNodeEvents();
  applyCanvasTransform();
}

// ===== 渲染连线 =====
function renderConnections() {
  const svg = document.getElementById('workflowSvg');
  if (!svg) return;

  let pathsHtml = svg.querySelector('defs').outerHTML;
  workflowState.connections.forEach(conn => {
    const fromNode = workflowState.nodes.find(n => n.id === conn.from);
    const toNode = workflowState.nodes.find(n => n.id === conn.to);
    if (!fromNode || !toNode) return;

    const fromNT = nodeTypes[fromNode.type];
    const toNT = nodeTypes[toNode.type];
    const fromPortIndex = fromNT?.outputs?.findIndex(o => o.name === conn.fromPort) || 0;
    const toPortIndex = toNT?.inputs?.findIndex(i => i.name === conn.toPort) || 0;

    const x1 = fromNode.x + 200;
    const y1 = fromNode.y + 30 + fromPortIndex * 20;
    const x2 = toNode.x;
    const y2 = toNode.y + 30 + toPortIndex * 20;
    const midX = (x1 + x2) / 2;

    const isSelected = workflowState.selectedConnId === conn.id;
    const hasCondition = conn.condition && conn.condition.trim();
    const strokeColor = isSelected ? '#ec4899' : (hasCondition ? '#f59e0b' : '#6366f1');
    const strokeWidth = isSelected ? 3 : 2;
    const dashArray = hasCondition ? '6,3' : '';

    pathsHtml += `
      <path d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}"
            fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"
            stroke-dasharray="${dashArray}"
            marker-end="url(#arrowhead)" data-conn-id="${conn.id}"
            style="cursor:pointer" onclick="selectConnection('${conn.id}')" />
    `;
    // 条件标签
    if (hasCondition) {
      pathsHtml += `
        <foreignObject x="${midX - 40}" y="${(y1+y2)/2 - 12}" width="80" height="24">
          <div style="background:#fef3c7;color:#92400e;font-size:10px;padding:2px 6px;border-radius:4px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${conn.condition}">⚡ ${conn.condition.substring(0, 10)}</div>
        </foreignObject>
      `;
    }
  });

  svg.innerHTML = pathsHtml;
}

// 选中连线
function selectConnection(connId) {
  workflowState.selectedConnId = connId;
  workflowState.selectedNodeId = null;
  renderWorkflow();
  updatePropertyPanel();
}

// 删除连线
function deleteConnection(connId) {
  if (confirm('确定删除这条连线吗？')) {
    workflowState.connections = workflowState.connections.filter(c => c.id !== connId);
    workflowState.selectedConnId = null;
    renderWorkflow();
    updatePropertyPanel();
    showToast('连线已删除', 'info');
  }
}

// ===== 节点事件绑定 =====
function bindNodeEvents() {
  document.querySelectorAll('.workflow-node').forEach(nodeEl => {
    const nodeId = parseInt(nodeEl.dataset.nodeId);

    nodeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!e.target.classList.contains('node-port')) {
        workflowState.selectedNodeId = nodeId;
        workflowState.selectedConnId = null;
        renderWorkflow();
        updatePropertyPanel();
      }
    });

    // 头部拖拽移动
    const header = nodeEl.querySelector('.workflow-node-header');
    if (header) {
      header.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('node-port')) return;
        e.preventDefault();
        const node = workflowState.nodes.find(n => n.id === nodeId);
        if (!node) return;

        isDraggingNode = true;
        dragOffset.x = (e.clientX - node.x * workflowState.zoom - workflowState.panX);
        dragOffset.y = (e.clientY - node.y * workflowState.zoom - workflowState.panY);

        const onMouseMove = (ev) => {
          if (!isDraggingNode) return;
          node.x = Math.max(0, (ev.clientX - dragOffset.x - workflowState.panX) / workflowState.zoom);
          node.y = Math.max(0, (ev.clientY - dragOffset.y - workflowState.panY) / workflowState.zoom);
          nodeEl.style.left = node.x + 'px';
          nodeEl.style.top = node.y + 'px';
          renderConnections();
        };

        const onMouseUp = () => {
          isDraggingNode = false;
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          saveCurrentWorkflow();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    }

    // 端口连线
    nodeEl.querySelectorAll('.node-port').forEach(port => {
      port.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (port.dataset.portType !== 'input' && port.classList.contains('output')) {
          isConnecting = true;
          connectionStart = nodeId;
          connectionStartPort = port.dataset.port;

          const svg = document.getElementById('workflowSvg');
          tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          tempLine.setAttribute('fill', 'none');
          tempLine.setAttribute('stroke', '#ec4899');
          tempLine.setAttribute('stroke-width', '2');
          tempLine.setAttribute('stroke-dasharray', '5,5');
          svg.appendChild(tempLine);

          const node = workflowState.nodes.find(n => n.id === nodeId);
          const portIndex = parseInt(port.dataset.portIndex) || 0;
          updateTempLine(node.x + 200, node.y + 30 + portIndex * 20);
        }
      });

      port.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        if (isConnecting && port.classList.contains('input') && connectionStart !== null) {
          const targetId = nodeId;
          if (connectionStart !== targetId) {
            const exists = workflowState.connections.some(c => c.from === connectionStart && c.to === targetId && c.fromPort === connectionStartPort && c.toPort === port.dataset.port);
            if (!exists) {
              workflowState.connections.push({
                id: 'c' + Date.now(),
                from: connectionStart,
                fromPort: connectionStartPort,
                to: targetId,
                toPort: port.dataset.port,
                condition: ''
              });
              showToast('连线已创建', 'success');
            }
          }
        }
        isConnecting = false;
        connectionStart = null;
        if (tempLine) { tempLine.remove(); tempLine = null; }
        renderWorkflow();
      });
    });
  });
}

// 更新临时连线
function updateTempLine(x, y) {
  if (!tempLine || !connectionStart) return;
  const fromNode = workflowState.nodes.find(n => n.id === connectionStart);
  if (!fromNode) return;
  const fromNT = nodeTypes[fromNode.type];
  const portIndex = fromNT?.outputs?.findIndex(o => o.name === connectionStartPort) || 0;
  const x1 = fromNode.x + 200;
  const y1 = fromNode.y + 30 + portIndex * 20;
  const midX = (x1 + x) / 2;
  tempLine.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y}, ${x} ${y}`);
}

// ===== 属性面板（Coze风格Tab） =====
function updatePropertyPanel() {
  const panel = document.getElementById('propertyPanel');
  if (!panel) return;

  // 连线属性
  if (workflowState.selectedConnId) {
    const conn = workflowState.connections.find(c => c.id === workflowState.selectedConnId);
    if (conn) {
      const fromNode = workflowState.nodes.find(n => n.id === conn.from);
      const toNode = workflowState.nodes.find(n => n.id === conn.to);
      panel.innerHTML = `
        <h3>🔗 连线属性</h3>
        <div style="font-size:12px;color:var(--text-lighter);margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)">
          ${fromNode ? nodeTypes[fromNode.type]?.name : '?'} → ${toNode ? nodeTypes[toNode.type]?.name : '?'}
        </div>
        <div class="property-group">
          <label>条件表达式（满足条件才执行）</label>
          <textarea id="conn-condition" style="min-height:80px;font-family:monospace;font-size:12px" placeholder="例如: {{2.answer}} 包含 '是'&#10;留空表示无条件执行">${conn.condition || ''}</textarea>
          <div style="font-size:11px;color:var(--text-lighter);margin-top:4px">支持 {{节点ID.变量名}} 变量引用</div>
        </div>
        <div style="margin-top:16px">
          <button class="toolbar-btn danger" style="width:100%;justify-content:center" onclick="deleteConnection('${conn.id}')">🗑️ 删除连线</button>
        </div>
      `;
      const condInput = document.getElementById('conn-condition');
      if (condInput) {
        condInput.addEventListener('change', () => {
          conn.condition = condInput.value;
          renderWorkflow();
          saveCurrentWorkflow();
        });
      }
      return;
    }
  }

  if (!workflowState.selectedNodeId) {
    panel.innerHTML = `
      <h3>节点属性</h3>
      <div class="property-empty">
        <div class="icon">👆</div>
        <p>请选择一个节点或连线<br>查看和编辑属性</p>
        <div style="margin-top:16px;font-size:11px;color:var(--text-lighter);text-align:left">
          <div style="margin-bottom:4px">⌨️ 快捷键：</div>
          <div>• Delete：删除选中</div>
          <div>• Ctrl+S：保存工作流</div>
          <div>• Ctrl+滚轮：缩放画布</div>
          <div>• 空格+拖拽：平移画布</div>
        </div>
      </div>
    `;
    return;
  }

  const node = workflowState.nodes.find(n => n.id === workflowState.selectedNodeId);
  if (!node) return;

  const nt = nodeTypes[node.type];
  const config = node.config || {};

  // 构建配置表单HTML
  let configHtml = buildNodeConfigForm(node, nt, config);

  // 输入参数Tab内容
  let inputsHtml = '';
  if (nt.inputs && nt.inputs.length > 0) {
    inputsHtml = nt.inputs.map(inp => {
      const val = config[`input_${inp.name}`] || '';
      return `
        <div class="property-group">
          <label style="display:flex;justify-content:space-between;align-items:center">
            <span>${inp.name} <span style="color:var(--text-lighter);font-weight:400">(${inp.type})</span></span>
            <button class="toolbar-btn" style="padding:2px 8px;font-size:11px" onclick="insertVariable('input_${inp.name}')">＋变量</button>
          </label>
          <input type="text" id="cfg-input_${inp.name}" value="${val}" placeholder="{{节点ID.变量名}} 或直接输入">
          <div style="font-size:10px;color:var(--text-lighter);margin-top:2px">${inp.desc}</div>
        </div>
      `;
    }).join('');
  } else {
    inputsHtml = '<p style="color:var(--text-lighter);font-size:12px;padding:12px;text-align:center">此节点无输入参数</p>';
  }

  // 输出变量Tab内容
  let outputsHtml = '';
  if (nt.outputs && nt.outputs.length > 0) {
    outputsHtml = nt.outputs.map(out => `
      <div style="padding:10px 12px;background:var(--bg);border-radius:8px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-weight:600;font-size:13px">${out.name}</span>
          <span style="font-size:10px;padding:1px 6px;background:#dbeafe;color:#1e40af;border-radius:4px">${out.type}</span>
        </div>
        <div style="font-size:11px;color:var(--text-light)">${out.desc}</div>
        <div style="font-size:10px;color:var(--primary);margin-top:4px;font-family:monospace">引用: {{${node.id}.${out.name}}}</div>
      </div>
    `).join('');
  } else {
    outputsHtml = '<p style="color:var(--text-lighter);font-size:12px;padding:12px;text-align:center">此节点无输出变量</p>';
  }

  // 运行结果（调试模式下显示）
  let resultHtml = '';
  if (runtimeState.nodeResults[node.id]) {
    const result = runtimeState.nodeResults[node.id];
    resultHtml = `
      <div style="padding:12px;background:${result.error ? '#fef2f2' : '#f0fdf4'};border-radius:8px;margin-bottom:12px">
        <div style="font-weight:600;font-size:12px;margin-bottom:6px;color:${result.error ? '#dc2626' : '#16a34a'}">
          ${result.error ? '❌ 执行失败' : '✅ 执行成功'}
        </div>
        <pre style="font-size:11px;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow:auto;color:var(--text)">${JSON.stringify(result, null, 2)}</pre>
      </div>
    `;
  }

  panel.innerHTML = `
    <h3>${nt.icon} ${nt.name}</h3>
    <div style="font-size:11px;color:var(--text-lighter);margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">
      节点ID: #${node.id} | 类型: ${node.type}
    </div>
    ${resultHtml}
    <div class="property-tabs">
      <button class="property-tab active" data-tab="config" onclick="switchPropertyTab('config')">⚙️ 配置</button>
      <button class="property-tab" data-tab="inputs" onclick="switchPropertyTab('inputs')">📥 输入</button>
      <button class="property-tab" data-tab="outputs" onclick="switchPropertyTab('outputs')">📤 输出</button>
    </div>
    <div class="property-tab-content" id="tab-config">${configHtml}</div>
    <div class="property-tab-content" id="tab-inputs" style="display:none">${inputsHtml}</div>
    <div class="property-tab-content" id="tab-outputs" style="display:none">${outputsHtml}</div>
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
      <button class="toolbar-btn danger" style="width:100%;justify-content:center" onclick="deleteSelectedNode()">🗑️ 删除此节点</button>
    </div>
  `;

  // 绑定配置变更事件
  panel.querySelectorAll('[id^="cfg-"]').forEach(input => {
    const key = input.id.replace('cfg-', '');
    input.addEventListener('change', () => {
      node.config[key] = input.value;
      renderWorkflow();
      saveCurrentWorkflow();
    });
    if (input.type === 'range') {
      input.addEventListener('input', () => {
        node.config[key] = parseFloat(input.value);
        if (input.previousElementSibling) {
          input.previousElementSibling.textContent = `温度 (${input.value})`;
        }
        saveCurrentWorkflow();
      });
    }
  });
}

// 构建节点配置表单
function buildNodeConfigForm(node, nt, config) {
  // AI能力节点
  if (nt.category) {
    const categoryTools = allTools.filter(t => t.category === nt.category);
    const selectedTool = categoryTools.find(t => t.name === config.tool);

    let toolOptions = categoryTools.map(t =>
      `<option value="${t.name}" ${config.tool === t.name ? 'selected' : ''}>${t.name} ${t.tags && t.tags.includes('国内') ? '🇨🇳' : '🌍'}</option>`
    ).join('');

    let html = `
      <div class="property-group">
        <label>选择AI工具（共${categoryTools.length}款）</label>
        <select id="cfg-tool">${toolOptions}</select>
      </div>
    `;

    if (selectedTool) {
      const pricingText = { free: '免费', freemium: '免费+付费', paid: '付费' }[selectedTool.pricing] || '未知';
      html += `
        <div style="padding:10px;background:var(--bg);border-radius:8px;margin-bottom:12px;font-size:11px">
          <div style="font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:4px;flex-wrap:wrap">
            ${selectedTool.name}
            <span style="font-size:9px;padding:1px 5px;background:${selectedTool.pricing === 'free' ? '#dcfce7' : selectedTool.pricing === 'paid' ? '#fef3c7' : '#dbeafe'};border-radius:100px">${pricingText}</span>
            <span style="font-size:9px">⭐ ${selectedTool.rating || '4.0'}</span>
          </div>
          <div style="color:var(--text-light);line-height:1.4;margin-bottom:4px">${selectedTool.description}</div>
          <a href="${selectedTool.official_url}" target="_blank" style="color:var(--primary);font-weight:600">访问官网 →</a>
        </div>
      `;
    }

    html += `
      <div class="property-group">
        <label style="display:flex;justify-content:space-between;align-items:center">
          <span>提示词 / 输入描述</span>
          <button class="toolbar-btn" style="padding:2px 8px;font-size:11px" onclick="insertVariable('prompt')">＋变量</button>
        </label>
        <textarea id="cfg-prompt" placeholder="输入提示词，支持 {{节点ID.变量名}} 引用">${config.prompt || ''}</textarea>
      </div>
    `;

    // 分类特定配置
    switch(node.type) {
      case 'ai_chat':
        html += `
          <div class="property-group">
            <label>温度 (${config.temperature || 0.7})</label>
            <input type="range" id="cfg-temperature" min="0" max="1" step="0.1" value="${config.temperature || 0.7}">
          </div>
          <div class="property-group">
            <label>系统提示词</label>
            <textarea id="cfg-system" style="min-height:60px" placeholder="设置AI角色和行为...">${config.system || ''}</textarea>
          </div>
        `;
        break;
      case 'ai_image':
        html += `
          <div class="property-group"><label>艺术风格</label>
            <select id="cfg-style"><option>写实</option><option>动漫</option><option>油画</option><option>水彩</option><option>赛博朋克</option><option>3D渲染</option><option>国潮</option></select>
          </div>
          <div class="property-group"><label>尺寸比例</label>
            <select id="cfg-size"><option>1024x1024</option><option>1024x1792</option><option>1792x1024</option></select>
          </div>
        `;
        break;
      case 'ai_music':
        html += `
          <div class="property-group"><label>音乐风格</label>
            <select id="cfg-style"><option>流行</option><option>摇滚</option><option>电子</option><option>古典</option><option>爵士</option><option>嘻哈</option><option>国风</option></select>
          </div>
          <div class="property-group"><label>时长(秒)</label>
            <input type="number" id="cfg-duration" value="${config.duration || 30}" min="5" max="300">
          </div>
        `;
        break;
      case 'ai_writing':
        html += `
          <div class="property-group"><label>写作风格</label>
            <select id="cfg-style"><option>专业</option><option>活泼</option><option>严谨</option><option>文艺</option><option>幽默</option></select>
          </div>
          <div class="property-group"><label>篇幅</label>
            <select id="cfg-length"><option>简短</option><option>中等</option><option>详细</option><option>长文</option></select>
          </div>
        `;
        break;
      case 'ai_coding':
        html += `<div class="property-group"><label>编程语言</label>
          <select id="cfg-language"><option>JavaScript</option><option>Python</option><option>TypeScript</option><option>Java</option><option>Go</option><option>Rust</option><option>SQL</option></select>
        </div>`;
        break;
      case 'ai_video':
        html += `
          <div class="property-group"><label>时长(秒)</label><input type="number" id="cfg-duration" value="${config.duration || 5}" min="1" max="60"></div>
          <div class="property-group"><label>分辨率</label><select id="cfg-resolution"><option>720p</option><option>1080p</option><option>4K</option></select></div>
        `;
        break;
      case 'ai_office':
        html += `<div class="property-group"><label>任务类型</label>
          <select id="cfg-task"><option>文档总结</option><option>PPT生成</option><option>表格处理</option><option>邮件撰写</option><option>会议纪要</option><option>翻译</option></select>
        </div>`;
        break;
      case 'ai_design':
        html += `
          <div class="property-group"><label>设计风格</label><select id="cfg-style"><option>现代</option><option>商务</option><option>创意</option><option>复古</option><option>科技</option></select></div>
          <div class="property-group"><label>输出格式</label><select id="cfg-format"><option>PNG</option><option>JPG</option><option>SVG</option><option>PDF</option></select></div>
        `;
        break;
      case 'ai_education':
        html += `
          <div class="property-group"><label>学科领域</label><select id="cfg-subject"><option>通用</option><option>数学</option><option>英语</option><option>物理</option><option>化学</option><option>编程</option></select></div>
          <div class="property-group"><label>难度等级</label><select id="cfg-level"><option>初级</option><option>中级</option><option>高级</option></select></div>
        `;
        break;
      case 'ai_data':
        html += `<div class="property-group"><label>图表类型</label>
          <select id="cfg-chartType"><option>柱状图</option><option>折线图</option><option>饼图</option><option>散点图</option><option>热力图</option><option>仪表盘</option></select>
        </div>`;
        break;
    }
    return html;
  }

  // 基础/工具节点配置
  switch(node.type) {
    case 'input':
      return `
        <div class="property-group"><label>变量名</label><input type="text" id="cfg-varName" value="${config.varName || 'input'}" placeholder="变量名"></div>
        <div class="property-group"><label>默认值</label><textarea id="cfg-data" placeholder="输入默认值...">${config.data || ''}</textarea></div>
      `;
    case 'output':
      return `<div class="property-group"><label>输出格式</label>
        <select id="cfg-format"><option value="text">纯文本</option><option value="json">JSON</option><option value="markdown">Markdown</option><option value="html">HTML</option></select>
      </div>`;
    case 'variable':
      return `
        <div class="property-group"><label>变量名</label><input type="text" id="cfg-name" value="${config.name || ''}" placeholder="变量名"></div>
        <div class="property-group"><label>操作</label>
          <select id="cfg-operation"><option value="set">设置值</option><option value="append">追加</option><option value="clear">清空</option></select>
        </div>
        <div class="property-group"><label>变量值</label><textarea id="cfg-value" placeholder="支持 {{节点ID.变量名}}">${config.value || ''}</textarea></div>
      `;
    case 'condition':
      return `
        <div class="property-group"><label>左操作数</label><input type="text" id="cfg-left" value="${config.left || ''}" placeholder="{{节点ID.变量名}}"></div>
        <div class="property-group"><label>操作符</label>
          <select id="cfg-operator"><option value="contains">包含</option><option value="equals">等于</option><option value="notEquals">不等于</option><option value="gt">大于</option><option value="lt">小于</option><option value="regex">正则匹配</option><option value="notEmpty">非空</option></select>
        </div>
        <div class="property-group"><label>右操作数</label><input type="text" id="cfg-right" value="${config.right || ''}" placeholder="比较值"></div>
      `;
    case 'switch':
      return `
        <div class="property-group"><label>判断值</label><input type="text" id="cfg-value" value="${config.value || ''}" placeholder="{{节点ID.变量名}}"></div>
        <div class="property-group"><label>分支配置（JSON）</label><textarea id="cfg-cases" style="font-family:monospace;font-size:11px;min-height:100px">${JSON.stringify(config.cases || [{match:'',output:''}], null, 2)}</textarea></div>
      `;
    case 'loop':
      return `
        <div class="property-group"><label>遍历数组</label><input type="text" id="cfg-array" value="${config.array || ''}" placeholder="{{节点ID.变量名}}"></div>
        <div class="property-group"><label>当前项变量名</label><input type="text" id="cfg-itemVar" value="${config.itemVar || 'item'}"></div>
      `;
    case 'delay':
      return `<div class="property-group"><label>延时（毫秒）</label><input type="number" id="cfg-duration" value="${config.duration || 1000}" min="0"></div>`;
    case 'code':
      return `
        <div class="property-group"><label>语言</label>
          <select id="cfg-language"><option value="javascript">JavaScript</option><option value="python">Python</option></select>
        </div>
        <div class="property-group"><label>代码</label><textarea id="cfg-code" style="font-family:monospace;font-size:12px;min-height:150px">${config.code || ''}</textarea></div>
      `;
    case 'http_request':
      return `
        <div class="property-group"><label>请求URL</label><input type="text" id="cfg-url" value="${config.url || ''}" placeholder="https://api.example.com"></div>
        <div class="property-group"><label>方法</label>
          <select id="cfg-method"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select>
        </div>
        <div class="property-group"><label>请求头（JSON）</label><textarea id="cfg-headers" style="font-family:monospace;font-size:11px;min-height:60px">${config.headers || ''}</textarea></div>
        <div class="property-group"><label>请求体（JSON）</label><textarea id="cfg-body" style="font-family:monospace;font-size:11px;min-height:60px">${config.body || ''}</textarea></div>
      `;
    case 'knowledge':
      return `
        <div class="property-group"><label>知识库ID</label><input type="text" id="cfg-knowledgeId" value="${config.knowledgeId || ''}" placeholder="知识库ID"></div>
        <div class="property-group"><label>返回条数</label><input type="number" id="cfg-topK" value="${config.topK || 5}" min="1" max="20"></div>
      `;
    case 'plugin':
      return `
        <div class="property-group"><label>插件ID</label><input type="text" id="cfg-pluginId" value="${config.pluginId || ''}" placeholder="插件ID"></div>
        <div class="property-group"><label>参数（JSON）</label><textarea id="cfg-params" style="font-family:monospace;font-size:11px">${config.params || ''}</textarea></div>
      `;
    case 'database':
      return `
        <div class="property-group"><label>操作类型</label>
          <select id="cfg-operation"><option value="query">查询</option><option value="insert">插入</option><option value="update">更新</option><option value="delete">删除</option></select>
        </div>
        <div class="property-group"><label>SQL/条件</label><textarea id="cfg-sql" style="font-family:monospace;font-size:11px;min-height:80px">${config.sql || ''}</textarea></div>
      `;
    case 'text_process':
      return `
        <div class="property-group"><label>处理类型</label>
          <select id="cfg-operation"><option value="template">模板渲染</option><option value="replace">替换</option><option value="extract">提取</option><option value="split">分割</option><option value="trim">去空格</option><option value="uppercase">大写</option><option value="lowercase">小写</option></select>
        </div>
        <div class="property-group"><label>模板/模式</label><textarea id="cfg-template" placeholder="支持 {{节点ID.变量名}}">${config.template || ''}</textarea></div>
        <div class="property-group"><label>替换为</label><input type="text" id="cfg-replacement" value="${config.replacement || ''}"></div>
      `;
    case 'message':
      return `
        <div class="property-group"><label>通知渠道</label>
          <select id="cfg-channel"><option value="webhook">Webhook</option><option value="email">邮件</option><option value="sms">短信</option><option value="dingtalk">钉钉</option><option value="feishu">飞书</option></select>
        </div>
        <div class="property-group"><label>接收目标</label><input type="text" id="cfg-target" value="${config.target || ''}" placeholder="URL/邮箱/手机号"></div>
        <div class="property-group"><label>消息内容</label><textarea id="cfg-content" placeholder="支持 {{节点ID.变量名}}">${config.content || ''}</textarea></div>
      `;
    case 'note':
      return `<div class="property-group"><label>注释内容</label><textarea id="cfg-text" style="min-height:100px">${config.text || ''}</textarea></div>`;
    case 'start':
    case 'end':
      return '<p style="color:var(--text-lighter);font-size:12px;padding:12px;text-align:center">此节点无需额外配置</p>';
    default:
      return '<p style="color:var(--text-lighter);font-size:12px">此节点无需配置</p>';
  }
}

// 切换属性Tab
function switchPropertyTab(tabName) {
  document.querySelectorAll('.property-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.property-tab-content').forEach(c => c.style.display = 'none');
  document.querySelector(`.property-tab[data-tab="${tabName}"]`)?.classList.add('active');
  document.getElementById(`tab-${tabName}`).style.display = 'block';
}

// 插入变量到输入框
function insertVariable(fieldId) {
  const input = document.getElementById(`cfg-${fieldId}`);
  if (!input) return;
  const vars = getAvailableVariables(workflowState.selectedNodeId);
  if (vars.length === 0) {
    showToast('暂无可用变量，请先连接其他节点', 'warning');
    return;
  }
  // 简单弹出选择（实际可做更复杂的变量选择器）
  const varList = vars.map((v, i) => `${i+1}. ${v.label} → ${v.value}`).join('\n');
  const choice = prompt(`选择要插入的变量（输入序号）：\n\n${varList}`, '1');
  if (choice && vars[parseInt(choice) - 1]) {
    const start = input.selectionStart || input.value.length;
    const end = input.selectionEnd || input.value.length;
    input.value = input.value.substring(0, start) + vars[parseInt(choice) - 1].value + input.value.substring(end);
    input.dispatchEvent(new Event('change'));
    showToast('变量已插入', 'success');
  }
}

// ===== 删除选中节点 =====
function deleteSelectedNode() {
  if (!workflowState.selectedNodeId) return;
  const nodeId = workflowState.selectedNodeId;
  workflowState.connections = workflowState.connections.filter(c => c.from !== nodeId && c.to !== nodeId);
  workflowState.nodes = workflowState.nodes.filter(n => n.id !== nodeId);
  workflowState.selectedNodeId = null;
  renderWorkflow();
  updatePropertyPanel();
  saveCurrentWorkflow();
  showToast('节点已删除', 'info');
}

// ===== 保存/加载工作流 =====
function saveCurrentWorkflow() {
  workflowState.name = document.getElementById('workflowNameInput')?.value || '未命名工作流';
  const toSave = { ...workflowState };
  delete toSave.debugMode;
  localStorage.setItem('ai_marketplace_current_workflow', JSON.stringify(toSave));
}

function saveWorkflowToList() {
  saveCurrentWorkflow();
  const workflows = JSON.parse(localStorage.getItem(WORKFLOW_STORAGE_KEY) || '[]');
  const existingIndex = workflows.findIndex(w => w.id === workflowState.id);
  const workflowData = {
    ...workflowState,
    id: workflowState.id || 'wf_' + Date.now(),
    savedAt: new Date().toISOString(),
    nodeCount: workflowState.nodes.length,
    connCount: workflowState.connections.length
  };
  if (existingIndex >= 0) workflows[existingIndex] = workflowData;
  else workflows.unshift(workflowData);
  localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(workflows));
  loadWorkflowsList();
  showToast('工作流已保存', 'success');
}

function loadWorkflowsList() {
  const listEl = document.getElementById('workflowListContent');
  if (!listEl) return;
  const workflows = JSON.parse(localStorage.getItem(WORKFLOW_STORAGE_KEY) || '[]');
  if (workflows.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;padding:40px 16px;color:var(--text-lighter);font-size:13px">暂无保存的工作流<br>点击"保存"按钮创建第一个</div>';
    return;
  }
  listEl.innerHTML = workflows.map(wf => `
    <div class="workflow-list-item ${workflowState.id === wf.id ? 'active' : ''}" onclick="loadWorkflow('${wf.id}')">
      <div class="wf-name">${wf.name}</div>
      <div class="wf-meta">
        <span>${wf.nodeCount}节点 · ${wf.connCount}连线</span>
        <span>${new Date(wf.savedAt).toLocaleDateString()}</span>
      </div>
      <div class="wf-actions">
        <button class="wf-action-btn" onclick="event.stopPropagation();exportWorkflow('${wf.id}')">导出</button>
        <button class="wf-action-btn delete" onclick="event.stopPropagation();deleteWorkflow('${wf.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

function loadWorkflow(wfId) {
  const workflows = JSON.parse(localStorage.getItem(WORKFLOW_STORAGE_KEY) || '[]');
  const wf = workflows.find(w => w.id === wfId);
  if (!wf) return;
  workflowState = { ...workflowState, ...wf, selectedNodeId: null, selectedConnId: null, debugMode: false };
  runtimeState = { isRunning: false, currentNodeId: null, nodeResults: {}, variables: {}, executionOrder: [] };
  document.getElementById('workflowNameInput').value = wf.name;
  renderWorkflow();
  updatePropertyPanel();
  toggleWorkflowList(false);
  showToast(`已加载: ${wf.name}`, 'success');
}

function deleteWorkflow(wfId) {
  if (!confirm('确定删除此工作流吗？此操作不可恢复。')) return;
  let workflows = JSON.parse(localStorage.getItem(WORKFLOW_STORAGE_KEY) || '[]');
  workflows = workflows.filter(w => w.id !== wfId);
  localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(workflows));
  loadWorkflowsList();
  showToast('工作流已删除', 'info');
}

function exportWorkflow(wfId) {
  let wf;
  if (wfId) {
    const workflows = JSON.parse(localStorage.getItem(WORKFLOW_STORAGE_KEY) || '[]');
    wf = workflows.find(w => w.id === wfId);
  } else {
    saveCurrentWorkflow();
    wf = workflowState;
  }
  if (!wf) return;
  const dataStr = JSON.stringify(wf, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${wf.name || 'workflow'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('工作流已导出', 'success');
}

function importWorkflow(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wf = JSON.parse(e.target.result);
      if (!wf.nodes || !wf.connections) throw new Error('无效的工作流文件');
      workflowState = { ...workflowState, ...wf, selectedNodeId: null, selectedConnId: null, id: 'wf_' + Date.now() };
      runtimeState = { isRunning: false, currentNodeId: null, nodeResults: {}, variables: {}, executionOrder: [] };
      document.getElementById('workflowNameInput').value = workflowState.name;
      renderWorkflow();
      updatePropertyPanel();
      saveCurrentWorkflow();
      showToast('工作流导入成功', 'success');
    } catch (err) {
      showToast('导入失败：' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

function toggleWorkflowList(show) {
  const panel = document.getElementById('workflowListPanel');
  if (!panel) return;
  if (show === undefined) panel.classList.toggle('open');
  else panel.classList.toggle('open', show);
}

// ===== 工具栏事件 =====
function setupToolbarEvents() {
  const nameInput = document.getElementById('workflowNameInput');
  if (nameInput) {
    nameInput.addEventListener('change', saveCurrentWorkflow);
    nameInput.addEventListener('input', () => { workflowState.name = nameInput.value; });
  }
  const importInput = document.getElementById('importWorkflowInput');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      if (e.target.files[0]) { importWorkflow(e.target.files[0]); e.target.value = ''; }
    });
  }
}

// ===== 运行工作流（Coze风格执行引擎） =====
function runWorkflow() {
  if (workflowState.nodes.length === 0) {
    showToast('工作流为空，请先添加节点', 'warning');
    return;
  }

  // 检查Token
  const aiNodeCount = workflowState.nodes.filter(n => nodeTypes[n.type]?.category).length;
  const runCost = aiNodeCount * 5;
  if (getTokenBalance() < runCost) {
    showToast(`运行需要 ${runCost} Token，余额不足`, 'error');
    openRechargeModal();
    return;
  }
  consumeTokens(runCost);

  // 重置运行时状态
  runtimeState = {
    isRunning: true,
    currentNodeId: null,
    nodeResults: {},
    variables: {},
    executionOrder: []
  };

  addLog('info', `🚀 开始运行工作流: ${workflowState.name}`);
  addLog('info', `📊 节点数: ${workflowState.nodes.length}, 连线数: ${workflowState.connections.length}`);
  addLog('info', `💰 消耗Token: ${runCost}`);
  toggleRunLog(true);

  // 拓扑排序执行
  const startNodes = workflowState.nodes.filter(n => {
    const nt = nodeTypes[n.type];
    return nt && (!nt.hasInput || n.type === 'start' || n.type === 'input');
  });

  const visited = new Set();
  let delay = 0;

  function executeNode(node, inputData) {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    runtimeState.executionOrder.push(node.id);

    const execDelay = delay;
    delay += 400;

    setTimeout(() => {
      runtimeState.currentNodeId = node.id;
      const nt = nodeTypes[node.type];
      const statusEl = document.getElementById(`node-status-${node.id}`);
      if (statusEl) {
        statusEl.textContent = '运行中';
        statusEl.style.background = '#fef3c7';
        statusEl.style.color = '#92400e';
      }
      document.querySelector(`[data-node-id="${node.id}"]`)?.classList.add('running');
      addLog('info', `▶ [${node.id}] ${nt.name} 开始执行`);

      // 模拟执行
      setTimeout(() => {
        try {
          const result = simulateNodeExecution(node, inputData);
          runtimeState.nodeResults[node.id] = result;

          if (statusEl) {
            statusEl.textContent = '完成';
            statusEl.style.background = '#dcfce7';
            statusEl.style.color = '#166534';
          }
          document.querySelector(`[data-node-id="${node.id}"]`)?.classList.remove('running');
          document.querySelector(`[data-node-id="${node.id}"]`)?.classList.add('completed');
          addLog('success', `✓ [${node.id}] ${nt.name} 执行成功`);

          // 条件判断节点的分支处理
          if (node.type === 'condition') {
            const conditionResult = result.conditionResult;
            const nextConns = workflowState.connections.filter(c => c.from === node.id);
            nextConns.forEach(conn => {
              const nextNode = workflowState.nodes.find(n => n.id === conn.to);
              if (!nextNode) return;
              // 条件连线：只有满足条件才执行
              if (conn.condition && conn.condition.trim()) {
                const condMet = evaluateCondition(conn.condition, runtimeState.nodeResults);
                if (condMet) {
                  addLog('info', `⚡ 连线条件满足: ${conn.condition}`);
                  executeNode(nextNode, result);
                } else {
                  addLog('warning', `⏭️ 连线条件不满足，跳过: ${conn.condition}`);
                }
              } else {
                executeNode(nextNode, result);
              }
            });
          } else {
            // 普通节点：执行所有下游
            const nextConns = workflowState.connections.filter(c => c.from === node.id);
            nextConns.forEach(conn => {
              const nextNode = workflowState.nodes.find(n => n.id === conn.to);
              if (nextNode) executeNode(nextNode, result);
            });
          }
        } catch (err) {
          runtimeState.nodeResults[node.id] = { error: err.message };
          if (statusEl) {
            statusEl.textContent = '失败';
            statusEl.style.background = '#fee2e2';
            statusEl.style.color = '#991b1b';
          }
          document.querySelector(`[data-node-id="${node.id}"]`)?.classList.remove('running');
          addLog('error', `✗ [${node.id}] ${nt.name} 执行失败: ${err.message}`);
        }
      }, 600 + Math.random() * 400);
    }, execDelay);
  }

  startNodes.forEach(n => executeNode(n, null));

  // 运行完成
  setTimeout(() => {
    runtimeState.isRunning = false;
    runtimeState.currentNodeId = null;
    addLog('success', `🎉 工作流运行完成！共执行 ${runtimeState.executionOrder.length} 个节点`);
    showToast('工作流运行完成', 'success');
    updatePropertyPanel(); // 刷新显示运行结果
  }, delay + 1500);
}

// 模拟节点执行
function simulateNodeExecution(node, inputData) {
  const config = node.config || {};
  const nt = nodeTypes[node.type];

  // 解析变量引用
  const parseVal = (val) => parseVariables(val, runtimeState.nodeResults);

  // AI节点
  if (nt.category) {
    const prompt = parseVal(config.prompt) || (inputData?.answer) || (inputData?.data) || '测试输入';
    const tool = config.tool || 'AI模型';
    return {
      answer: `【${tool}】针对"${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}"的模拟回答。这是工作流运行的模拟输出，实际使用时将调用真实API。`,
      usage: { prompt_tokens: Math.floor(prompt.length / 4), completion_tokens: 150, total_tokens: Math.floor(prompt.length / 4) + 150 },
      tool: tool,
      model: config.tool
    };
  }

  switch(node.type) {
    case 'start':
      return { output: workflowState.testData || {} };
    case 'input':
      return { data: parseVal(config.data) || config.varName || 'input_value' };
    case 'output':
      return { result: inputData || parseVal(config.input) || '输出结果' };
    case 'variable':
      const varVal = parseVal(config.value) || inputData;
      runtimeState.variables[config.name] = varVal;
      return { value: varVal, name: config.name };
    case 'condition':
      const left = parseVal(config.left) || (inputData?.answer) || (inputData?.data) || '';
      const right = parseVal(config.right) || '';
      let conditionResult = false;
      switch(config.operator) {
        case 'contains': conditionResult = String(left).includes(right); break;
        case 'equals': conditionResult = left == right; break;
        case 'notEquals': conditionResult = left != right; break;
        case 'gt': conditionResult = parseFloat(left) > parseFloat(right); break;
        case 'lt': conditionResult = parseFloat(left) < parseFloat(right); break;
        case 'regex': conditionResult = new RegExp(right).test(left); break;
        case 'notEmpty': conditionResult = left !== '' && left !== null && left !== undefined; break;
      }
      return {
        conditionResult: conditionResult,
        true: conditionResult ? inputData : null,
        false: !conditionResult ? inputData : null,
        left: left,
        right: right,
        operator: config.operator
      };
    case 'switch':
      return { matched: parseVal(config.value) || 'default', result: inputData };
    case 'loop':
      return { result: [inputData, inputData], item: inputData, index: 0 };
    case 'delay':
      return { output: inputData, delayed: config.duration || 1000 };
    case 'code':
      try {
        // 安全模拟：不实际执行用户代码
        return { output: `代码执行结果（模拟）`, input: inputData };
      } catch(e) {
        throw new Error('代码执行错误: ' + e.message);
      }
    case 'http_request':
      return {
        response: { status: 200, data: { message: '模拟API响应' } },
        status: 200,
        url: config.url
      };
    case 'knowledge':
      return {
        documents: [
          { title: '模拟文档1', content: '这是检索到的相关文档内容...', score: 0.95 },
          { title: '模拟文档2', content: '另一个相关文档...', score: 0.87 }
        ],
        query: parseVal(config.prompt) || inputData
      };
    case 'plugin':
      return { output: '插件调用结果（模拟）', pluginId: config.pluginId };
    case 'database':
      return { result: [{ id: 1, name: '模拟数据' }], operation: config.operation };
    case 'text_process':
      const text = parseVal(config.template) || (inputData?.answer) || (inputData?.data) || '';
      return { result: `[已处理] ${text}`, original: text, operation: config.operation };
    case 'message':
      return { status: 'sent', channel: config.channel, messageId: 'msg_' + Date.now() };
    case 'note':
      return { note: config.text };
    case 'end':
      return { final: inputData || '工作流结束' };
    default:
      return { output: inputData };
  }
}

// 评估连线条件
function evaluateCondition(conditionStr, nodeResults) {
  try {
    // 简单条件评估：支持 "包含"、"=="、"!=" 等
    const parsed = parseVariables(conditionStr, nodeResults);
    // 如果解析后还是包含 {{}} 说明变量不存在
    if (parsed.includes('{{')) return false;
    // 简单评估
    if (parsed.includes('包含')) {
      const parts = parsed.split('包含');
      return parts[0].trim().includes(parts[1].trim());
    }
    if (parsed.includes('==')) {
      const parts = parsed.split('==');
      return parts[0].trim() === parts[1].trim();
    }
    if (parsed.includes('!=')) {
      const parts = parsed.split('!=');
      return parts[0].trim() !== parts[1].trim();
    }
    // 非空判断
    return parsed.trim() !== '' && parsed.trim() !== 'false' && parsed.trim() !== '0';
  } catch(e) {
    return false;
  }
}

// ===== 运行日志 =====
function addLog(type, message) {
  const content = document.getElementById('runLogContent');
  if (!content) return;
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.innerHTML = `<span class="log-time">[${time}]</span>${message}`;
  content.appendChild(line);
  content.scrollTop = content.scrollHeight;
}

function toggleRunLog(show) {
  const panel = document.getElementById('runLogPanel');
  if (!panel) return;
  if (show === undefined) panel.classList.toggle('open');
  else panel.classList.toggle('open', show);
}

function clearRunLog() {
  const content = document.getElementById('runLogContent');
  if (content) content.innerHTML = '';
}


// ===== 页面初始化 =====
async function init() {
  const loaded = await loadData();
  if (!loaded) {
    document.querySelectorAll('.tools-grid, .categories-grid').forEach(el => {
      el.innerHTML = '<div class="loading">数据加载中...</div>';
    });
    return;
  }

  // 根据页面类型初始化
  const pageType = document.body.dataset.page;
  
  switch (pageType) {
    case 'home':
      initHomePage();
      break;
    case 'category':
      initCategoryPage();
      break;
    case 'detail':
      initDetailPage();
      break;
    case 'about':
      initAboutPage();
      break;
    case 'workbench':
      initWorkbenchPage();
      break;
  }

  initCommon();
}

// DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
