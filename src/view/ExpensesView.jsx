import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { FiBriefcase, FiCoffee, FiCreditCard, FiDollarSign, FiHome, FiMoreHorizontal, FiShoppingBag, FiTool, FiTruck, FiUmbrella } from 'react-icons/fi'
import { isCurrentYearToDate } from '../utils/buyDateFilters.js'
import './ExpensesView.css'

const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#0ea5e9', '#a855f7', '#f97316']
const groupIcons = [FiShoppingBag, FiHome, FiCreditCard, FiTruck, FiCoffee, FiBriefcase, FiTool, FiUmbrella, FiDollarSign, FiMoreHorizontal]
const formatCurrency = (value) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)

export default function ExpensesView({ buyRecords = [], groupRecords = [], error, onSelectGroup, onShowAllGroups }) {
  const currentYear = new Date().getFullYear()
  const expenses = groupRecords
    .filter((group) => group.all === true)
    .map((group, index) => {
      const groupId = group.uid ?? group.id
      const groupBuys = buyRecords.filter((buy) => {
          return buy.group === groupId && isCurrentYearToDate(buy.data_valore)
        })
      if (!groupBuys.length) return null
      const value = groupBuys
        .reduce((sum, buy) => sum + (Number(buy.amount) || 0), 0)

      return {
        id: groupId,
        name: group.name || 'Gruppo senza nome',
        value,
        color: colors[index % colors.length],
        icon: groupIcons[Number(group.icon)] ?? groupIcons[9],
      }
    })
    .filter(Boolean)
  const excludedGroups = groupRecords
    .filter((group) => group.all === false)
    .map((group) => {
      const groupId = group.uid ?? group.id
      const value = buyRecords
        .filter((buy) => {
          return buy.group === groupId && isCurrentYearToDate(buy.data_valore)
        })
        .reduce((sum, buy) => sum + (Number(buy.amount) || 0), 0)

      return { id: groupId, name: group.name || 'Gruppo senza nome', value, icon: groupIcons[Number(group.icon)] ?? groupIcons[9] }
    })
    .filter((group) => group.value !== 0)
  const total = expenses.reduce((sum, item) => sum + item.value, 0)
  const visibleExpenses = expenses.filter((item) => item.value !== 0)

  return (
    <>
      <div className="section-heading">
        <h1>Spese</h1>
      </div>
      <section className="chart-card expense-chart">
        <div>
          <h2>Spese per categoria</h2>
          <p>{error ? 'Impossibile recuperare le spese' : `Totale: ${formatCurrency(total)}`}</p>
        </div>
        {!error && visibleExpenses.length ? (
          <div className="pie-layout">
            <div className="pie-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visibleExpenses}
                    dataKey="value"
                    innerRadius={57}
                    outerRadius={87}
                    paddingAngle={4}
                    onClick={(entry) => onSelectGroup(entry?.payload?.id ?? entry?.id)}
                  >
                    {visibleExpenses.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                    <Label value={currentYear} position="center" fill="var(--text-main)" fontSize={18} fontWeight={800} />
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="chart-legend">
              {expenses.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <button type="button" className="expense-group-button" onClick={() => onSelectGroup(item.id)}>
                      <span className="expense-group-icon" style={{ color: item.color }}>
                        <Icon />
                      </span>
                      <span>{item.name}</span>
                      <b>{formatCurrency(item.value)}</b>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <p className="empty-chart">
            {error ? 'Riprova più tardi.' : 'Non ci sono ancora spese nei gruppi selezionati.'}
          </p>
        )}
      </section>
      <section className="chart-card">
        <div>
          <h2>Gruppi esclusi</h2>
        </div>
        {excludedGroups.length ? (
          <ul className="chart-legend excluded-groups-list">
            {excludedGroups.map((group) => {
              const Icon = group.icon
              return (
                <li key={group.id}>
                  <button type="button" className="expense-group-button" onClick={() => onSelectGroup(group.id)}>
                    <span className="expense-group-icon">
                      <Icon />
                    </span>
                    <span>{group.name}</span>
                    <b>{formatCurrency(group.value)}</b>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="empty-chart">Non ci sono gruppi esclusi con spese nell'anno corrente.</p>
        )}
      </section>
      <div className="all-groups-action">
        <button type="button" onClick={onShowAllGroups}>Mostra tutti i gruppi</button>
      </div>
    </>
  )
}
