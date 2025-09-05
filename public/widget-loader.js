// public/widget-loader.js
(function() {
  'use strict';

  const FINCLUE_API_BASE = (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
    ? 'http://localhost:3000/api/widget'
    : 'https://finclue.de/api/widget';
  
  // Utility functions
  const createElement = (tag, className, innerHTML) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
  };

  // Deutsche Formatierung wie in CurrencyContext
  const formatLargeNumber = (value) => {
    if (!value) return '–';
    const absValue = Math.abs(value);
    
    if (absValue >= 1e12) {
      return `${(value / 1e12).toLocaleString('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })} Bio. $`;
    } else if (absValue >= 1e9) {
      return `${(value / 1e9).toLocaleString('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })} Mrd. $`;
    } else if (absValue >= 1e6) {
      return `${(value / 1e6).toLocaleString('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })} Mio. $`;
    } else if (absValue >= 1e3) {
      return `${(value / 1e3).toLocaleString('de-DE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}k $`;
    }
    return `${Math.round(value).toLocaleString('de-DE')} $`;
  };

  const formatPercent = (value) => {
    if (!value && value !== 0) return '–';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toLocaleString('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })}%`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '–';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('de-DE');
    } catch {
      return dateStr;
    }
  };

  // Widget CSS (isolated with prefix) - EXACTLY matches SuperInvestor Cards
  const widgetCSS = `
    .finclue-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #161618;
      border-radius: 16px;
      padding: 20px;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.06);
      width: 100%;
      max-width: 400px;
      min-height: 500px;
      height: auto;
      transition: all 0.3s ease;
      box-sizing: border-box;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    
    .finclue-widget:hover {
      background: #1A1A1D;
      border-color: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
    }
    
    .finclue-widget-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    
    .finclue-widget-investor-info {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex: 1;
    }
    
    .finclue-widget-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
      flex-shrink: 0;
      ring: 2px solid rgba(255, 255, 255, 0.1);
    }
    
    .finclue-widget:hover .finclue-widget-avatar {
      ring-color: rgba(255, 255, 255, 0.2);
    }
    
    .finclue-widget-avatar-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .finclue-widget-avatar-fallback {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
    }
    
    .finclue-widget-investor-details {
      min-width: 0;
      flex: 1;
    }
    
    .finclue-widget-investor-name {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 0.2s ease;
    }
    
    .finclue-widget:hover .finclue-widget-investor-name {
      color: #10b981;
    }
    
    .finclue-widget-firm {
      font-size: 12px;
      color: #9ca3af;
      margin: 2px 0 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .finclue-widget-external-link {
      width: 16px;
      height: 16px;
      color: #6b7280;
      transition: color 0.2s ease;
      flex-shrink: 0;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
    }
    
    .finclue-widget:hover .finclue-widget-external-link {
      color: #10b981;
    }
    
    .finclue-widget-chart {
      height: 84px;
      background: rgba(55, 65, 81, 0.3);
      border-radius: 8px;
      margin-bottom: 12px;
      padding: 8px;
      position: relative;
      overflow: hidden;
    }
    
    .finclue-widget-chart-svg {
      width: 100%;
      height: 100%;
    }
    
    .finclue-widget-chart-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #6b7280;
      font-size: 12px;
    }
    
    .finclue-widget-metrics {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 12px;
    }
    
    .finclue-widget-metric-label {
      color: #9ca3af;
      margin-bottom: 4px;
      font-size: 11px;
    }
    
    .finclue-widget-metric-value {
      font-weight: 500;
      font-size: 14px;
    }
    
    .finclue-widget-positive {
      color: #10b981;
    }
    
    .finclue-widget-negative {
      color: #ef4444;
    }
    
    .finclue-widget-holdings {
      flex: 1;
      min-height: 0;
      margin-bottom: 12px;
      overflow: hidden;
    }
    
    .finclue-widget-holdings-title {
      color: #9ca3af;
      font-size: 12px;
      margin-bottom: 8px;
    }
    
    .finclue-widget-holdings-grid {
      display: flex;
      gap: 8px;
      overflow: hidden;
    }
    
    .finclue-widget-holding {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 0;
      flex: 1;
    }
    
    .finclue-widget-ticker {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      color: #d1d5db;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      text-align: center;
    }
    
    .finclue-widget-percentage {
      color: #9ca3af;
      font-size: 12px;
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .finclue-widget-additional-metrics {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
      padding: 8px 12px;
      background: rgba(55, 65, 81, 0.2);
      border-radius: 6px;
    }
    
    .finclue-widget-metric-small {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
    }
    
    .finclue-widget-metric-label-small {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 2px;
      text-align: center;
    }
    
    .finclue-widget-metric-value-small {
      font-size: 12px;
      font-weight: 600;
      color: #ffffff;
      text-align: center;
    }
    
    .finclue-widget-footer {
      padding-top: 12px;
      margin-top: auto;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .finclue-widget-link {
      display: flex;
      align-items: center;
    }
    
    .finclue-widget-link a {
      color: #10b981;
      text-decoration: none;
      font-size: 12px;
      font-weight: 500;
      transition: color 0.2s ease;
    }
    
    .finclue-widget-link a:hover {
      color: #059669;
    }
    
    .finclue-widget-date {
      font-size: 12px;
      color: #6b7280;
    }
    
    .finclue-widget-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #9ca3af;
    }
    
    .finclue-widget-error {
      text-align: center;
      padding: 20px;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 8px;
      margin: 10px 0;
    }
    
    .finclue-widget-loading-spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(16, 185, 129, 0.3);
      border-radius: 50%;
      border-top: 2px solid #10b981;
      animation: finclue-widget-spin 1s linear infinite;
      margin-bottom: 8px;
    }
    
    @keyframes finclue-widget-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @media (max-width: 480px) {
      .finclue-widget {
        padding: 16px;
        margin: 0 auto;
        max-width: calc(100vw - 20px);
      }
      
      .finclue-widget-metrics {
        gap: 8px;
      }
      
      .finclue-widget-metric-value {
        font-size: 13px;
      }
      
      .finclue-widget-holdings-grid {
        gap: 6px;
      }
    }
  `;

  // Widget class
  class FinclueWidget {
    constructor(containerId, options) {
      this.containerId = containerId;
      this.investor = options.investor;
      this.apiKey = options.apiKey;
      this.container = document.getElementById(containerId);
      
      if (!this.container) {
        console.error(`Finclue Widget: Container with id "${containerId}" not found`);
        return;
      }
      
      this.init();
    }
    
    init() {
      // Inject CSS if not already present
      if (!document.getElementById('finclue-widget-styles')) {
        const style = createElement('style');
        style.id = 'finclue-widget-styles';
        style.textContent = widgetCSS;
        document.head.appendChild(style);
      }
      
      this.showLoading();
      this.loadData();
    }
    
    showLoading() {
      this.container.innerHTML = `
        <div class="finclue-widget">
          <div class="finclue-widget-loading">
            <div class="finclue-widget-loading-spinner"></div>
            <div>Loading investor data...</div>
          </div>
        </div>
      `;
    }
    
    showError(message) {
      this.container.innerHTML = `
        <div class="finclue-widget">
          <div class="finclue-widget-error">
            <strong>Error:</strong> ${message}
          </div>
          <div class="finclue-widget-footer">
            <div class="finclue-widget-powered-by">
              Powered by <a href="https://finclue.de" target="_blank">FinClue</a>
            </div>
          </div>
        </div>
      `;
    }
    
    async loadData() {
      try {
        const url = `${FINCLUE_API_BASE}/${this.investor}?api_key=${encodeURIComponent(this.apiKey)}`;
        console.log('FinClue Widget: Loading data from', url);
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        console.log('FinClue Widget: Response status', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('FinClue Widget: Error response', errorText);
          
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          } catch {
            throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText.slice(0, 200)}`);
          }
        }
        
        const data = await response.json();
        console.log('FinClue Widget: Received data', data);
        this.render(data);
        
      } catch (error) {
        console.error('Finclue Widget Error:', error);
        this.showError(error.message || 'Failed to load data');
      }
    }
    
    render(data) {
      const investorName = this.formatInvestorName(data.investor);
      const avatarInitials = this.getInitials(investorName);
      const investorImage = this.getInvestorImage(data.investor);
      
      const isPositive = data.total_change_percent >= 0;
      const isQuarterlyPositive = data.quarterly_change_percent >= 0;
      
      // Create SVG chart
      const chartSVG = this.createChart(data.chart_data, isPositive);
      
      let holdingsHTML = '';
      let additionalMetrics = '';
      
      if (data.top_holdings && data.top_holdings.length > 0) {
        holdingsHTML = data.top_holdings.slice(0, 5).map(holding => `
          <div class="finclue-widget-holding">
            <span class="finclue-widget-ticker">${holding.ticker}</span>
            <span class="finclue-widget-percentage">${holding.percentage.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
          </div>
        `).join('');
        
        // Calculate additional metrics
        const totalPositions = data.total_positions || data.top_holdings.length;
        const top3Concentration = data.top_holdings.slice(0, 3).reduce((sum, holding) => sum + holding.percentage, 0);
        
        additionalMetrics = `
          <div class="finclue-widget-additional-metrics">
            <div class="finclue-widget-metric-small">
              <span class="finclue-widget-metric-label-small">Positionen</span>
              <span class="finclue-widget-metric-value-small">${totalPositions}</span>
            </div>
            <div class="finclue-widget-metric-small">
              <span class="finclue-widget-metric-label-small">Top 3 Anteil</span>
              <span class="finclue-widget-metric-value-small">${top3Concentration.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
            </div>
          </div>
        `;
      } else {
        holdingsHTML = `
          <div class="finclue-widget-holding">
            <span class="finclue-widget-ticker">AAPL</span>
            <span class="finclue-widget-percentage">22,3%</span>
          </div>
          <div class="finclue-widget-holding">
            <span class="finclue-widget-ticker">AXP</span>
            <span class="finclue-widget-percentage">18,8%</span>
          </div>
          <div class="finclue-widget-holding">
            <span class="finclue-widget-ticker">BAC</span>
            <span class="finclue-widget-percentage">11,1%</span>
          </div>
          <div class="finclue-widget-holding">
            <span class="finclue-widget-ticker">KO</span>
            <span class="finclue-widget-percentage">8,5%</span>
          </div>
          <div class="finclue-widget-holding">
            <span class="finclue-widget-ticker">CVX</span>
            <span class="finclue-widget-percentage">5,9%</span>
          </div>
        `;
        
        // Demo additional metrics
        additionalMetrics = `
          <div class="finclue-widget-additional-metrics">
            <div class="finclue-widget-metric-small">
              <span class="finclue-widget-metric-label-small">Positionen</span>
              <span class="finclue-widget-metric-value-small">45</span>
            </div>
            <div class="finclue-widget-metric-small">
              <span class="finclue-widget-metric-label-small">Top 3 Anteil</span>
              <span class="finclue-widget-metric-value-small">52,2%</span>
            </div>
          </div>
        `;
      }
      
      this.container.innerHTML = `
        <div class="finclue-widget">
          <!-- Header with Avatar and Name -->
          <div class="finclue-widget-header">
            <div class="finclue-widget-investor-info">
              <div class="finclue-widget-avatar">
                ${investorImage ? `<img src="${investorImage}" alt="${investorName}" class="finclue-widget-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                <div class="finclue-widget-avatar-fallback" style="${investorImage ? 'display:none;' : 'display:flex;'}">${avatarInitials}</div>
              </div>
              <div class="finclue-widget-investor-details">
                <h3 class="finclue-widget-investor-name">${investorName}</h3>
                <p class="finclue-widget-firm">Super Investor</p>
              </div>
            </div>
            <svg class="finclue-widget-external-link" viewBox="0 0 24 24" onclick="window.open('https://finclue.de/superinvestor/${this.investor}', '_blank')">
              <path d="m7 17 10-10M17 7H7v10"/>
            </svg>
          </div>
          
          <!-- Chart Area -->
          <div class="finclue-widget-chart">
            ${chartSVG}
          </div>
          
          <!-- Performance Metrics Grid -->
          <div class="finclue-widget-metrics">
            <div>
              <div class="finclue-widget-metric-label">Portfolio</div>
              <div class="finclue-widget-metric-value finclue-widget-positive">
                ${formatLargeNumber(data.portfolio_value)}
              </div>
            </div>
            <div>
              <div class="finclue-widget-metric-label">
                <svg class="finclue-widget-trend-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  ${isPositive ? '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>' : '<polyline points="1 18 8.5 10.5 13.5 15.5 23 6"></polyline>'}
                </svg>
                Letzte 4Q
              </div>
              <div class="finclue-widget-metric-value ${isPositive ? 'finclue-widget-positive' : 'finclue-widget-negative'}">
                ${formatPercent(data.total_change_percent)}
              </div>
            </div>
            <div>
              <div class="finclue-widget-metric-label">Q zu Q</div>
              <div class="finclue-widget-metric-value ${isQuarterlyPositive ? 'finclue-widget-positive' : 'finclue-widget-negative'}">
                ${formatPercent(data.quarterly_change_percent)}
              </div>
            </div>
          </div>
          
          <!-- Top Holdings -->
          <div class="finclue-widget-holdings">
            <div class="finclue-widget-holdings-title">Top Holdings</div>
            <div class="finclue-widget-holdings-grid">
              ${holdingsHTML}
            </div>
          </div>
          
          <!-- Additional Metrics -->
          ${additionalMetrics}
          
          <!-- Footer -->
          <div class="finclue-widget-footer">
            <div class="finclue-widget-date">
              ${formatDate(data.last_update)}
            </div>
            <div class="finclue-widget-link">
              <a href="https://finclue.de/superinvestor/${this.investor}" target="_blank">
                Vollständige Analyse auf FinClue →
              </a>
            </div>
          </div>
        </div>
      `;
    }
    
    createChart(chartData, isPositive) {
      if (!chartData || chartData.length < 2) {
        return '<div class="finclue-widget-chart-placeholder">Keine Chart-Daten</div>';
      }
      
      const width = 320;
      const height = 72; // Increased height for axes
      const padding = 20; // More padding for axes
      const chartHeight = height - 30; // Reserve space for X-axis
      const chartWidth = width - 30; // Reserve space for Y-axis
      
      // Find min/max values
      const values = chartData.map(d => d.value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const valueRange = maxValue - minValue || 1;
      
      // Create path points
      const points = chartData.map((d, i) => {
        const x = padding + (i / (chartData.length - 1)) * chartWidth;
        const y = padding + (1 - ((d.value - minValue) / valueRange)) * (chartHeight - padding);
        return `${x},${y}`;
      });
      
      const pathD = `M ${points.join(' L ')}`;
      const color = isPositive ? '#10b981' : '#ef4444';
      
      // Create area fill path
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      const areaD = `${pathD} L ${lastPoint.split(',')[0]},${chartHeight} L ${firstPoint.split(',')[0]},${chartHeight} Z`;
      
      // Create grid lines
      const gridLines = [];
      // Horizontal grid lines (3 lines)
      for (let i = 1; i <= 2; i++) {
        const y = padding + (i * (chartHeight - padding)) / 3;
        gridLines.push(`<line x1="${padding}" y1="${y}" x2="${padding + chartWidth}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="2,2" />`);
      }
      
      // Vertical grid lines (show first, middle, last points)
      if (chartData.length > 2) {
        const middleIndex = Math.floor(chartData.length / 2);
        [0, middleIndex, chartData.length - 1].forEach((index) => {
          const x = padding + (index / (chartData.length - 1)) * chartWidth;
          gridLines.push(`<line x1="${x}" y1="${padding}" x2="${x}" y2="${chartHeight}" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="2,2" />`);
        });
      }
      
      // Format values for Y-axis
      const formatAxisValue = (value) => {
        const absValue = Math.abs(value);
        if (absValue >= 1e9) {
          return `${(value / 1e9).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mrd.`;
        } else if (absValue >= 1e6) {
          return `${(value / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Mio.`;
        } else if (absValue >= 1e3) {
          return `${(value / 1e3).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
        }
        return value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      };
      
      // Y-axis labels (min and max)
      const yLabels = [
        `<text x="${padding - 5}" y="${chartHeight + 3}" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="end">${formatAxisValue(minValue)}</text>`,
        `<text x="${padding - 5}" y="${padding + 3}" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="end">${formatAxisValue(maxValue)}</text>`
      ];
      
      // Format quarter for German display (Q4 2024 -> Q4 '24)
      const formatQuarter = (quarter) => {
        const match = quarter.match(/Q(\d)\s+(\d{4})/);
        if (match) {
          const q = match[1];
          const year = match[2].slice(-2); // Last 2 digits
          return `Q${q} '${year}`;
        }
        return quarter;
      };

      // X-axis labels (first and last quarters)
      const xLabels = [
        `<text x="${padding}" y="${height - 5}" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="start">${formatQuarter(chartData[0].quarter)}</text>`,
        `<text x="${padding + chartWidth}" y="${height - 5}" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="end">${formatQuarter(chartData[chartData.length - 1].quarter)}</text>`
      ];
      
      return `
        <svg class="finclue-widget-chart-svg" viewBox="0 0 ${width} ${height}">
          <defs>
            <linearGradient id="gradient-${this.investor}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${color};stop-opacity:0.3" />
              <stop offset="100%" style="stop-color:${color};stop-opacity:0.05" />
            </linearGradient>
          </defs>
          
          <!-- Grid lines -->
          ${gridLines.join('')}
          
          <!-- Chart area and line -->
          <path d="${areaD}" fill="url(#gradient-${this.investor})" />
          <path d="${pathD}" stroke="${color}" stroke-width="3" fill="none" />
          
          <!-- Axes labels -->
          ${yLabels.join('')}
          ${xLabels.join('')}
          
          <!-- Data points -->
          ${points.map((point) => {
            const [x, y] = point.split(',');
            return `<circle cx="${x}" cy="${y}" r="2" fill="${color}" opacity="0.8" />`;
          }).join('')}
        </svg>
      `;
    }
    
    formatInvestorName(slug) {
      const nameMap = {
        'buffett': 'Warren Buffett',
        'fisher': 'Ken Fisher',
        'ackman': 'Bill Ackman',
        'gates': 'Bill Gates',
        'icahn': 'Carl Icahn',
        'einhorn': 'David Einhorn'
      };
      return nameMap[slug] || slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]/g, ' ');
    }
    
    getInvestorImage(slug) {
      const imageMap = {
        'buffett': '/images/buffett.png',
        'fisher': '/images/fisher.png',
        'ackman': '/images/ackman.png',
        'gates': '/images/gates.png',
        'icahn': '/images/icahn.png',
        'einhorn': '/images/einhorn.png'
      };
      return imageMap[slug] || null;
    }
    
    getInitials(name) {
      return name.split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
  }
  
  // Global API
  window.FinclueWidget = FinclueWidget;
  
  // Auto-initialize widgets with data attributes
  document.addEventListener('DOMContentLoaded', function() {
    const widgets = document.querySelectorAll('[data-finclue-widget]');
    widgets.forEach(widget => {
      const investor = widget.getAttribute('data-finclue-investor');
      const apiKey = widget.getAttribute('data-finclue-api-key');
      
      if (investor && apiKey && widget.id) {
        new FinclueWidget(widget.id, { investor, apiKey });
      }
    });
  });
  
})();