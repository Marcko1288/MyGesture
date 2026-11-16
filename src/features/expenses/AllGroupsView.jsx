import { useState } from 'react'
import {
  FiBriefcase,
  FiCoffee,
  FiCreditCard,
  FiDollarSign,
  FiHome,
  FiMoreHorizontal,
  FiShoppingBag,
  FiTool,
  FiTruck,
  FiUmbrella,
} from 'react-icons/fi'
import { isCurrentYearToDate } from '../../domain/dates'
import { buyStore } from '../../data/mutations'
import { toDate as toFirestoreDate } from '../../domain/dates'
import './AllGroupsView.css'

const groupIcons = [
  FiShoppingBag,
  FiHome,
  FiCreditCard,
  FiTruck,
  FiCoffee,
  FiBriefcase,
  FiTool,
  FiUmbrella,
  FiDollarSign,
  FiMoreHorizontal,
]
const formatCurrency = (value) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)

export default function AllGroupsView({ groupRecords = [], buyRecords = [], userId, onBack, onSelectGroup }) {
  const [balancing, setBalancing] = useState(false)
  const [balanceMessage, setBalanceMessage] = useState('')
  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1
  const groups = groupRecords.map((group) => {
    const id = group.uid ?? group.id
    const total = buyRecords
      .filter((buy) => buy.group === id && isCurrentYearToDate(buy.data_valore))
      .reduce((sum, buy) => sum + (Number(buy.amount) || 0), 0)

    return { group, id, total, Icon: groupIcons[Number(group.icon)] ?? groupIcons[9] }
  })

  async function balancePreviousYear() {
    setBalancing(true)
    setBalanceMessage('')
    try {
      let balancedGroups = 0
      for (const group of groupRecords) {
        const groupId = group.uid ?? group.id
        const previousTotal = buyRecords
          .filter((buy) => buy.group === groupId && toFirestoreDate(buy.data_valore)?.getFullYear() === previousYear)
          .reduce((sum, buy) => sum + (Number(buy.amount) || 0), 0)
        if (Math.abs(previousTotal) < 0.001) continue

        await buyStore.create(
          {
            name: `Pareggio ${previousYear}`,
            amount: -previousTotal,
            data_valore: new Date(previousYear, 11, 31, 12).toISOString(),
            group: groupId,
            icon: group.icon ?? 0,
            repeat: false,
          },
          userId,
        )
        await buyStore.create(
          {
            name: `Riporto ${currentYear}`,
            amount: previousTotal,
            data_valore: new Date(currentYear, 0, 1, 12).toISOString(),
            group: groupId,
            icon: group.icon ?? 0,
            repeat: false,
          },
          userId,
        )
        balancedGroups += 1
      }
      setBalanceMessage(
        balancedGroups
          ? `Pareggio completato per ${balancedGroups} gruppi.`
          : `Non ci sono importi da pareggiare per il ${previousYear}.`,
      )
    } catch (error) {
      setBalanceMessage(error.message || 'Non è stato possibile completare il pareggio.')
    } finally {
      setBalancing(false)
    }
  }

  return (
    <>
      <div className="section-heading all-groups-heading">
        <div className="all-groups-header-actions">
          <button type="button" className="back-button" onClick={onBack}>
            Indietro
          </button>
          <button type="button" className="balance-groups-button" onClick={balancePreviousYear} disabled={balancing}>
            {balancing ? 'Pareggio...' : 'Pareggio'}
          </button>
        </div>
        <h1>Gruppi</h1>
      </div>
      {balanceMessage && <p className="all-groups-message">{balanceMessage}</p>}
      <section className="chart-card all-groups-card">
        {groups.length ? (
          <div className="all-groups-list">
            {groups.map(({ group, id, total, Icon }) => (
              <button type="button" className="all-group-row" key={id} onClick={() => onSelectGroup(group)}>
                <span className="all-group-icon">
                  <Icon />
                </span>
                <strong>{group.name || 'Gruppo senza nome'}</strong>
                <b>{formatCurrency(total)}</b>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-chart">Non ci sono ancora gruppi.</p>
        )}
      </section>
    </>
  )
}
