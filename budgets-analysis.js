// ============================================================================
// PRESUPUESTOS Y ANÁLISIS - FUNCIONES COMPLETAS
// ============================================================================
// Copia este código y pégalo ANTES del cierre de </script> en tu index.html
// ============================================================================

// ============================================================================
// VARIABLES GLOBALES PARA ANÁLISIS
// ============================================================================

let currentAnalysisTab = 'trends';
let analysisData = {
    monthlyTrends: [],
    predictions: {},
    comparisons: {},
    insights: []
};

// ============================================================================
// PRESUPUESTOS - FUNCIONES PRINCIPALES
// ============================================================================

function populateBudgetSelectors() {
    const now = new Date();
    const monthSelect = document.getElementById('budget-month');
    const yearSelect = document.getElementById('budget-year');
    
    if (!monthSelect || !yearSelect) return;
    
    // Poblar meses
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    monthSelect.innerHTML = months.map((month, index) => 
        `<option value="${index + 1}" ${index === now.getMonth() ? 'selected' : ''}>${month}</option>`
    ).join('');
    
    // Poblar años (año actual ± 2)
    const currentYear = now.getFullYear();
    yearSelect.innerHTML = '';
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
}

async function renderBudgets() {
    const month = parseInt(document.getElementById('budget-month')?.value || new Date().getMonth() + 1);
    const year = parseInt(document.getElementById('budget-year')?.value || new Date().getFullYear());
    
    // Cargar budgets del mes/año seleccionado
    let budgets = [];
    if (USE_SUPABASE) {
        const { data, error } = await supabase
            .from('budgets')
            .select('*')
            .eq('month', month)
            .eq('year', year);
        
        if (!error && data) {
            budgets = data.map(b => ({
                id: b.id,
                categoryId: b.category_id,
                month: b.month,
                year: b.year,
                amount: parseFloat(b.amount),
                alertThreshold: b.alert_threshold || 80
            }));
        }
    } else {
        budgets = state.budgets?.filter(b => b.month === month && b.year === year) || [];
    }
    
    // Calcular gastos reales del mes
    const monthMovements = state.movements.filter(m => {
        const movDate = new Date(m.date);
        return movDate.getMonth() === month - 1 && 
               movDate.getFullYear() === year &&
               m.type === 'expense';
    });
    
    // Agrupar por categoría
    const spendingByCategory = {};
    monthMovements.forEach(mov => {
        const catId = mov.categoryId || 'sin-categorizar';
        spendingByCategory[catId] = (spendingByCategory[catId] || 0) + mov.amount;
    });
    
    // Renderizar summary cards
    renderBudgetsSummary(budgets, spendingByCategory);
    
    // Renderizar tabla
    renderBudgetsTable(budgets, spendingByCategory);
}

function renderBudgetsSummary(budgets, spending) {
    const container = document.getElementById('budgets-summary');
    if (!container) return;
    
    if (budgets.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <div class="empty-state-icon">💰</div>
                    <div class="empty-state-title">No hay presupuestos definidos</div>
                    <div class="empty-state-text">Añade presupuestos para controlar tus gastos mensuales</div>
                    <button class="btn btn-primary" onclick="showAddBudgetModal()">+ Añadir Presupuesto</button>
                </div>
            </div>
        `;
        return;
    }
    
    const cards = budgets.map(budget => {
        const category = state.categories.find(c => c.id === budget.categoryId);
        const spent = spending[budget.categoryId] || 0;
        const percentage = (spent / budget.amount) * 100;
        const remaining = budget.amount - spent;
        
        let statusColor, statusIcon, statusText;
        if (percentage <= budget.alertThreshold) {
            statusColor = '#27AE60';
            statusIcon = '🟢';
            statusText = 'Dentro del presupuesto';
        } else if (percentage <= 100) {
            statusColor = '#F39C12';
            statusIcon = '🟡';
            statusText = 'Cerca del límite';
        } else {
            statusColor = '#E74C3C';
            statusIcon = '🔴';
            statusText = '¡Te has pasado!';
        }
        
        return `
            <div class="card" style="border-left: 4px solid ${statusColor};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <h3 style="margin: 0; font-size: 18px;">${statusIcon} ${category ? category.name : 'Desconocida'}</h3>
                        <p style="margin: 4px 0 0 0; color: var(--gray-600); font-size: 13px;">${statusText}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 24px; font-weight: 700; color: ${statusColor};">
                            ${percentage.toFixed(0)}%
                        </div>
                        <div style="font-size: 12px; color: var(--gray-600);">
                            ${spent.toFixed(2)}€ / ${budget.amount.toFixed(2)}€
                        </div>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div style="background: var(--gray-200); height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 12px;">
                    <div style="background: ${statusColor}; height: 100%; width: ${Math.min(percentage, 100)}%; transition: width 0.3s;"></div>
                </div>
                
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                    <span style="color: var(--gray-600);">Restante:</span>
                    <span style="font-weight: 600; color: ${remaining >= 0 ? '#27AE60' : '#E74C3C'};">
                        ${remaining >= 0 ? remaining.toFixed(2) : '0.00'}€
                    </span>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
            ${cards}
        </div>
    `;
}

function renderBudgetsTable(budgets, spending) {
    const container = document.getElementById('budgets-table-container');
    if (!container) return;
    
    if (budgets.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const rows = budgets.map(budget => {
        const category = state.categories.find(c => c.id === budget.categoryId);
        const spent = spending[budget.categoryId] || 0;
        const percentage = (spent / budget.amount) * 100;
        const remaining = budget.amount - spent;
        
        let statusBadge;
        if (percentage <= budget.alertThreshold) {
            statusBadge = '<span class="badge badge-success">✓ OK</span>';
        } else if (percentage <= 100) {
            statusBadge = '<span class="badge" style="background: #F39C12;">⚠ Alerta</span>';
        } else {
            statusBadge = '<span class="badge badge-danger">✗ Excedido</span>';
        }
        
        return `
            <tr>
                <td><strong>${category ? category.name : 'Desconocida'}</strong></td>
                <td style="text-align: right;">${budget.amount.toFixed(2)} €</td>
                <td style="text-align: right;">${spent.toFixed(2)} €</td>
                <td style="text-align: right; color: ${remaining >= 0 ? '#27AE60' : '#E74C3C'}; font-weight: 600;">
                    ${remaining.toFixed(2)} €
                </td>
                <td style="text-align: right;">${percentage.toFixed(1)}%</td>
                <td style="text-align: center;">${statusBadge}</td>
                <td>
                    <button class="btn btn-sm" onclick="editBudget('${budget.id}')" title="Editar">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBudget('${budget.id}')" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Categoría</th>
                        <th style="text-align: right;">Presupuesto</th>
                        <th style="text-align: right;">Gastado</th>
                        <th style="text-align: right;">Restante</th>
                        <th style="text-align: right;">%</th>
                        <th style="text-align: center;">Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function showAddBudgetModal() {
    // Por ahora, un prompt simple
    const month = parseInt(document.getElementById('budget-month').value);
    const year = parseInt(document.getElementById('budget-year').value);
    
    const categoryId = prompt('ID de categoría (ej: cat-alimentacion):');
    if (!categoryId) return;
    
    const amount = parseFloat(prompt('Presupuesto mensual (€):'));
    if (!amount || amount <= 0) return;
    
    const threshold = parseInt(prompt('Umbral de alerta % (ej: 80):') || '80');
    
    saveBudget({
        id: `budget-${Date.now()}`,
        categoryId,
        month,
        year,
        amount,
        alertThreshold: threshold
    });
}

async function saveBudget(budget) {
    if (USE_SUPABASE) {
        const supabaseBudget = {
            id: budget.id,
            category_id: budget.categoryId,
            month: budget.month,
            year: budget.year,
            amount: budget.amount,
            alert_threshold: budget.alertThreshold || 80
        };
        
        const { error } = await supabase
            .from('budgets')
            .upsert([supabaseBudget]);
        
        if (error) {
            console.error('Error guardando presupuesto:', error);
            alert('Error al guardar presupuesto');
            return;
        }
    } else {
        if (!state.budgets) state.budgets = [];
        const index = state.budgets.findIndex(b => b.id === budget.id);
        if (index >= 0) {
            state.budgets[index] = budget;
        } else {
            state.budgets.push(budget);
        }
        saveState(state);
    }
    
    renderBudgets();
}

async function deleteBudget(id) {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    
    if (USE_SUPABASE) {
        const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error eliminando presupuesto:', error);
            return;
        }
    } else {
        state.budgets = state.budgets.filter(b => b.id !== id);
        saveState(state);
    }
    
    renderBudgets();
}

// ============================================================================
// ANÁLISIS - FUNCIONES PRINCIPALES
// ============================================================================

function switchAnalysisTab(tab) {
    currentAnalysisTab = tab;
    
    // Update tab styles
    ['trends', 'predictions', 'comparisons', 'insights'].forEach(t => {
        const tabBtn = document.getElementById(`analysis-tab-${t}`);
        if (tabBtn) {
            if (t === tab) {
                tabBtn.style.background = 'var(--primary)';
                tabBtn.style.color = 'white';
                tabBtn.style.fontWeight = '700';
            } else {
                tabBtn.style.background = 'var(--gray-100)';
                tabBtn.style.color = 'var(--gray-900)';
                tabBtn.style.fontWeight = '400';
            }
        }
    });
    
    renderAnalysisContent();
}

async function renderAnalysisContent() {
    const container = document.getElementById('analysis-content');
    if (!container) return;
    
    // Calculate analysis data
    await calculateAnalysisData();
    
    switch (currentAnalysisTab) {
        case 'trends':
            renderTrendsAnalysis(container);
            break;
        case 'predictions':
            renderPredictionsAnalysis(container);
            break;
        case 'comparisons':
            renderComparisonsAnalysis(container);
            break;
        case 'insights':
            renderInsightsAnalysis(container);
            break;
    }
}

async function calculateAnalysisData() {
    const now = new Date();
    
    // Get last 12 months of movements
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = date.getMonth();
        const year = date.getFullYear();
        
        const monthMovements = state.movements.filter(m => {
            const movDate = new Date(m.date);
            return movDate.getMonth() === month && movDate.getFullYear() === year;
        });
        
        const income = monthMovements.filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0);
        const expenses = monthMovements.filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0);
        
        last12Months.push({
            month,
            year,
            label: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
            income,
            expenses,
            balance: income - expenses,
            movements: monthMovements.length
        });
    }
    
    analysisData.monthlyTrends = last12Months;
    
    // Calculate predictions (simple moving average of last 3 months)
    const last3Months = last12Months.slice(-3);
    const avgIncome = last3Months.reduce((s, m) => s + m.income, 0) / 3;
    const avgExpenses = last3Months.reduce((s, m) => s + m.expenses, 0) / 3;
    
    analysisData.predictions = {
        income: avgIncome,
        expenses: avgExpenses,
        balance: avgIncome - avgExpenses
    };
    
    // Calculate comparisons
    const thisMonth = last12Months[last12Months.length - 1];
    const lastMonth = last12Months[last12Months.length - 2];
    
    analysisData.comparisons = {
        thisMonth,
        lastMonth,
        incomeChange: ((thisMonth.income - lastMonth.income) / lastMonth.income) * 100,
        expensesChange: ((thisMonth.expenses - lastMonth.expenses) / lastMonth.expenses) * 100
    };
}

function renderTrendsAnalysis(container) {
    const trends = analysisData.monthlyTrends;
    
    const chartData = trends.map(t => ({
        label: t.label,
        income: t.income,
        expenses: t.expenses,
        balance: t.balance
    }));
    
    container.innerHTML = `
        <div class="card">
            <h3 class="card-title">📊 Evolución Mensual (últimos 12 meses)</h3>
            <canvas id="trends-chart" style="max-height: 400px;"></canvas>
        </div>
        
        <div class="card" style="margin-top: 24px;">
            <h3 class="card-title">📈 Detalle por Mes</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Mes</th>
                            <th style="text-align: right;">💚 Ingresos</th>
                            <th style="text-align: right;">🔴 Gastos</th>
                            <th style="text-align: right;">⚖️ Balance</th>
                            <th style="text-align: right;">Movimientos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${trends.map(t => `
                            <tr>
                                <td><strong>${t.label}</strong></td>
                                <td style="text-align: right; color: #27AE60;">+${t.income.toFixed(2)} €</td>
                                <td style="text-align: right; color: #E74C3C;">-${t.expenses.toFixed(2)} €</td>
                                <td style="text-align: right; font-weight: 700; color: ${t.balance >= 0 ? '#27AE60' : '#E74C3C'};">
                                    ${t.balance.toFixed(2)} €
                                </td>
                                <td style="text-align: right;">${t.movements}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Render chart
    const ctx = document.getElementById('trends-chart');
    if (ctx && window.Chart) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(d => d.label),
                datasets: [
                    {
                        label: 'Ingresos',
                        data: chartData.map(d => d.income),
                        borderColor: '#27AE60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Gastos',
                        data: chartData.map(d => d.expenses),
                        borderColor: '#E74C3C',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                }
            }
        });
    }
}

function renderPredictionsAnalysis(container) {
    const pred = analysisData.predictions;
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 24px;">
            <div class="card" style="background: linear-gradient(135deg, #27AE60 0%, #1E7E34 100%); color: white;">
                <h3 style="color: white; margin-bottom: 12px;">🔮 Ingresos Estimados</h3>
                <div style="font-size: 36px; font-weight: 700; margin: 16px 0;">
                    ${pred.income.toFixed(2)} €
                </div>
                <p style="opacity: 0.9; margin: 0;">Próximo mes (estimado)</p>
            </div>
            
            <div class="card" style="background: linear-gradient(135deg, #E74C3C 0%, #C0392B 100%); color: white;">
                <h3 style="color: white; margin-bottom: 12px;">🔮 Gastos Estimados</h3>
                <div style="font-size: 36px; font-weight: 700; margin: 16px 0;">
                    ${pred.expenses.toFixed(2)} €
                </div>
                <p style="opacity: 0.9; margin: 0;">Próximo mes (estimado)</p>
            </div>
            
            <div class="card" style="background: linear-gradient(135deg, #3498DB 0%, #2E6DA4 100%); color: white;">
                <h3 style="color: white; margin-bottom: 12px;">🔮 Ahorro Estimado</h3>
                <div style="font-size: 36px; font-weight: 700; margin: 16px 0;">
                    ${pred.balance.toFixed(2)} €
                </div>
                <p style="opacity: 0.9; margin: 0;">Próximo mes (estimado)</p>
            </div>
        </div>
        
        <div class="card">
            <h3 class="card-title">ℹ️ Cómo se calculan las predicciones</h3>
            <p style="color: var(--gray-600); line-height: 1.6;">
                Las predicciones se basan en el <strong>promedio de los últimos 3 meses</strong>. 
                Este método simple pero efectivo te da una estimación realista de tus finanzas futuras 
                basándose en tu comportamiento reciente.
            </p>
            <p style="color: var(--gray-600); line-height: 1.6; margin: 12px 0 0 0;">
                💡 <strong>Tip:</strong> Cuantos más datos tengas registrados, más precisas serán las predicciones.
            </p>
        </div>
    `;
}

function renderComparisonsAnalysis(container) {
    const comp = analysisData.comparisons;
    
    container.innerHTML = `
        <div class="card">
            <h3 class="card-title">📉 Este Mes vs Mes Anterior</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-top: 20px;">
                <div style="padding: 20px; background: var(--gray-50); border-radius: 8px;">
                    <div style="color: var(--gray-600); font-size: 14px; margin-bottom: 8px;">💚 Ingresos</div>
                    <div style="font-size: 28px; font-weight: 700; color: #27AE60; margin-bottom: 8px;">
                        ${comp.thisMonth.income.toFixed(2)} €
                    </div>
                    <div style="font-size: 14px; color: ${comp.incomeChange >= 0 ? '#27AE60' : '#E74C3C'};">
                        ${comp.incomeChange >= 0 ? '↗' : '↘'} ${Math.abs(comp.incomeChange).toFixed(1)}% vs mes anterior
                    </div>
                </div>
                
                <div style="padding: 20px; background: var(--gray-50); border-radius: 8px;">
                    <div style="color: var(--gray-600); font-size: 14px; margin-bottom: 8px;">🔴 Gastos</div>
                    <div style="font-size: 28px; font-weight: 700; color: #E74C3C; margin-bottom: 8px;">
                        ${comp.thisMonth.expenses.toFixed(2)} €
                    </div>
                    <div style="font-size: 14px; color: ${comp.expensesChange <= 0 ? '#27AE60' : '#E74C3C'};">
                        ${comp.expensesChange >= 0 ? '↗' : '↘'} ${Math.abs(comp.expensesChange).toFixed(1)}% vs mes anterior
                    </div>
                </div>
                
                <div style="padding: 20px; background: var(--gray-50); border-radius: 8px;">
                    <div style="color: var(--gray-600); font-size: 14px; margin-bottom: 8px;">⚖️ Balance</div>
                    <div style="font-size: 28px; font-weight: 700; color: ${comp.thisMonth.balance >= 0 ? '#27AE60' : '#E74C3C'}; margin-bottom: 8px;">
                        ${comp.thisMonth.balance.toFixed(2)} €
                    </div>
                    <div style="font-size: 14px; color: var(--gray-600);">
                        Mes anterior: ${comp.lastMonth.balance.toFixed(2)} €
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderInsightsAnalysis(container) {
    const insights = generateInsights();
    
    container.innerHTML = `
        <div style="display: grid; gap: 16px;">
            ${insights.map(insight => `
                <div class="card" style="border-left: 4px solid ${insight.color};">
                    <div style="display: flex; align-items: start; gap: 16px;">
                        <div style="font-size: 32px;">${insight.icon}</div>
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 8px 0; font-size: 18px;">${insight.title}</h3>
                            <p style="margin: 0; color: var(--gray-700); line-height: 1.6;">
                                ${insight.description}
                            </p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function generateInsights() {
    const insights = [];
    const trends = analysisData.monthlyTrends;
    const comp = analysisData.comparisons;
    
    // Insight 1: Gasto medio diario
    const thisMonthExpenses = comp.thisMonth.expenses;
    const daysInMonth = new Date(comp.thisMonth.year, comp.thisMonth.month + 1, 0).getDate();
    const avgDaily = thisMonthExpenses / daysInMonth;
    
    insights.push({
        icon: '📊',
        title: 'Gasto Medio Diario',
        description: `Tu gasto promedio diario este mes es de ${avgDaily.toFixed(2)}€. Esto significa que gastas aproximadamente ${(avgDaily * 7).toFixed(2)}€ por semana.`,
        color: '#3498DB'
    });
    
    // Insight 2: Tendencia de gastos
    if (comp.expensesChange < -5) {
        insights.push({
            icon: '🎉',
            title: '¡Excelente Control de Gastos!',
            description: `Has reducido tus gastos un ${Math.abs(comp.expensesChange).toFixed(1)}% respecto al mes anterior. ¡Sigue así!`,
            color: '#27AE60'
        });
    } else if (comp.expensesChange > 10) {
        insights.push({
            icon: '⚠️',
            title: 'Aumento en los Gastos',
            description: `Tus gastos han aumentado un ${comp.expensesChange.toFixed(1)}% este mes. Revisa tus categorías de gasto para identificar dónde puedes optimizar.`,
            color: '#E74C3C'
        });
    }
    
    // Insight 3: Categoría con más gasto
    const categorySpending = {};
    state.movements
        .filter(m => m.type === 'expense')
        .forEach(m => {
            const catId = m.categoryId || 'sin-categorizar';
            categorySpending[catId] = (categorySpending[catId] || 0) + m.amount;
        });
    
    const topCategory = Object.entries(categorySpending)
        .sort((a, b) => b[1] - a[1])[0];
    
    if (topCategory) {
        const category = state.categories.find(c => c.id === topCategory[0]);
        insights.push({
            icon: '🏆',
            title: 'Categoría con Mayor Gasto',
            description: `${category?.name || 'Desconocida'} es tu categoría con más gasto: ${topCategory[1].toFixed(2)}€ en total.`,
            color: '#F39C12'
        });
    }
    
    // Insight 4: Tasa de ahorro
    const savingsRate = comp.thisMonth.income > 0 ? (comp.thisMonth.balance / comp.thisMonth.income) * 100 : 0;
    if (savingsRate >= 20) {
        insights.push({
            icon: '💰',
            title: '¡Excelente Ahorro!',
            description: `Estás ahorrando el ${savingsRate.toFixed(1)}% de tus ingresos. ¡Vas por buen camino hacia tus metas financieras!`,
            color: '#27AE60'
        });
    } else if (savingsRate < 10 && savingsRate >= 0) {
        insights.push({
            icon: '💡',
            title: 'Oportunidad de Ahorro',
            description: `Actualmente ahorras el ${savingsRate.toFixed(1)}% de tus ingresos. Intenta reducir gastos no esenciales para aumentar tu ahorro al 20%.`,
            color: '#F39C12'
        });
    }
    
    return insights;
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

// Esta función se llama cuando se cambia a la vista de presupuestos
function initBudgetsView() {
    populateBudgetSelectors();
    renderBudgets();
}

// Esta función se llama cuando se cambia a la vista de análisis
function initAnalysisView() {
    renderAnalysisContent();
}

console.log('✅ Módulo de Presupuestos y Análisis cargado');
