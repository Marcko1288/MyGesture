import { useEffect, useState } from 'react'
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FiBell, FiChevronRight, FiCreditCard, FiDollarSign, FiFileText, FiHome, FiLayers, FiLogOut, FiMenu, FiPlus, FiSettings, FiShoppingBag, FiUpload, FiX } from 'react-icons/fi'
import { auth } from '../firebase/firebase'
import { syncPushToken } from '../firebase/pushNotifications.js'
import { bankStore, buyStore, cashStore, groupStore, subscriptionStore } from '../store/firestoreStore.jsx'

import HomeView from "../view/HomeView.jsx"
import SavingsView from "../view/SavingsView.jsx"
import ExpensesView from "../view/ExpensesView.jsx"
import SettingsView from "../view/SettingsView.jsx"
import CashDetailView from "../view/CashDetailView.jsx"
import GroupBuysView from "../view/GroupBuysView.jsx"
import BuyDetailView from "../view/BuyDetailView.jsx"
import GroupDetailView from "../view/GroupDetailView.jsx"
import AllGroupsView from "../view/AllGroupsView.jsx"
import StatementView from "../view/StatementView.jsx"
import UploadStatementView from "../view/UploadStatementView.jsx"
import StatementCategoryView from "../view/StatementCategoryView.jsx"
import StatementDetailView from "../view/StatementDetailView.jsx"
import StatementCategoryTrendView from "../view/StatementCategoryTrendView.jsx"
import SubscriptionsView from "../view/SubscriptionsView.jsx"
import SubscriptionDetailView from "../view/SubscriptionDetailView.jsx"
import './HubView.css'


const navigation = [
    { label: 'Home', icon: FiHome }, 
    { label: 'Gestione Risparmi', icon: FiCreditCard }, 
    { label: 'Spese', icon: FiDollarSign }, 
    { label: 'Estratto Conto', icon: FiFileText },
    { label: 'Abbonamenti', icon: FiBell },
    { label: 'Impostazioni', icon: FiSettings }
]

export default function HubView({ user }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [section, setSection] = useState('Home');
    const [theme, setTheme] = useState(() => localStorage.getItem('mygesture-theme') || 'system');
    const [color, setColor] = useState(() => localStorage.getItem('mygesture-color') || '#4f46e5');
    const [cashRecords, setCashRecords] = useState([]);
    const [cashError, setCashError] = useState(false);
    const [buyRecords, setBuyRecords] = useState([]);
    const [groupRecords, setGroupRecords] = useState([]);
    const [buyError, setBuyError] = useState(false);
    const [bankRecords, setBankRecords] = useState([]);
    const [subscriptionRecords, setSubscriptionRecords] = useState([]);
    const [subscriptionFilter, setSubscriptionFilter] = useState('active');
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [renewalSubscription, setRenewalSubscription] = useState(null);
    const [selectedCash, setSelectedCash] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedBuy, setSelectedBuy] = useState(null);
    const [editingGroup, setEditingGroup] = useState(null);
    const [showAllGroups, setShowAllGroups] = useState(false);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [newItemType, setNewItemType] = useState(null);
    const [selectedStatementCategory, setSelectedStatementCategory] = useState(null);
    const [selectedStatementRecord, setSelectedStatementRecord] = useState(null);
    const [showStatementCategoryTrend, setShowStatementCategoryTrend] = useState(false);
    const [showCashHistory, setShowCashHistory] = useState(false);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.setProperty('--accent-color', color);
        localStorage.setItem('mygesture-theme', theme);
        localStorage.setItem('mygesture-color', color)
    }, [theme, color]);

    useEffect(() => {
        // Rinnova il token push a ogni avvio e quando l'app torna in primo piano.
        syncPushToken(user.uid, { force: true })
        const onVisible = () => { if (document.visibilityState === 'visible') syncPushToken(user.uid) }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
    }, [user.uid]);

    useEffect(() => {
        cashStore.subscribe(user.uid, (records) => {
            setCashRecords(records);
            setCashError(false)
        }, () => setCashError(true))
    }, [user.uid]);

    useEffect(() => {
        const unsubscribeBuys = buyStore.subscribe(user.uid, (records) => {
            setBuyRecords(records)
            setBuyError(false)
        }, () => setBuyError(true))
        const unsubscribeGroups = groupStore.subscribe(user.uid, (records) => {
            setGroupRecords(records)
            setBuyError(false)
        }, () => setBuyError(true))

        return () => {
            unsubscribeBuys()
            unsubscribeGroups()
        }
    }, [user.uid])

    useEffect(() => bankStore.subscribe(user.uid, setBankRecords, () => setBankRecords([])), [user.uid])

    useEffect(() => subscriptionStore.subscribe(user.uid, setSubscriptionRecords, () => setSubscriptionRecords([])), [user.uid])

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, [section, selectedCash, selectedGroup, selectedBuy, editingGroup, showAllGroups, selectedStatementCategory, selectedStatementRecord, showStatementCategoryTrend, selectedSubscription]);

    const content =
        newItemType === 'cash' ? <CashDetailView cash={null} userId={user.uid} buyRecords={buyRecords} groupRecords={groupRecords} onBack={() => setNewItemType(null)} /> :
        newItemType === 'buy' ? <BuyDetailView userId={user.uid} groupRecords={groupRecords} buyRecords={buyRecords} onBack={() => setNewItemType(null)} /> :
        newItemType === 'group' ? <GroupDetailView userId={user.uid} buyRecords={buyRecords} onBack={() => setNewItemType(null)} /> :
        newItemType === 'statement-upload' ? <UploadStatementView userId={user.uid} onBack={() => setNewItemType(null)} /> :
        newItemType === 'subscription' ? <SubscriptionDetailView subscription={renewalSubscription ?? undefined} userId={user.uid} onBack={() => { setNewItemType(null); setRenewalSubscription(null) }} /> :
        selectedCash ? <CashDetailView cash={selectedCash} userId={user.uid} buyRecords={buyRecords} groupRecords={groupRecords} onBack={() => setSelectedCash(null)} /> :
        selectedBuy ? <BuyDetailView buy={selectedBuy} userId={user.uid} groupRecords={groupRecords} buyRecords={buyRecords} onBack={() => setSelectedBuy(null)} /> :
        selectedStatementRecord ? <StatementDetailView record={selectedStatementRecord} onBack={() => setSelectedStatementRecord(null)} /> :
        showStatementCategoryTrend && selectedStatementCategory ? <StatementCategoryTrendView {...selectedStatementCategory} bankRecords={bankRecords} onBack={() => setShowStatementCategoryTrend(false)} onSelectRecord={setSelectedStatementRecord} /> :
        selectedStatementCategory ? <StatementCategoryView {...selectedStatementCategory} bankRecords={bankRecords} onBack={() => setSelectedStatementCategory(null)} onSelectRecord={setSelectedStatementRecord} onOpenTrend={() => setShowStatementCategoryTrend(true)} /> :
        editingGroup ? <GroupDetailView group={editingGroup} userId={user.uid} buyRecords={buyRecords} onBack={() => setEditingGroup(null)} onDeleted={() => { setEditingGroup(null); setSelectedGroup(null) }} /> :
        selectedGroup ? <GroupBuysView group={selectedGroup} buyRecords={buyRecords} onBack={() => setSelectedGroup(null)} onSelectBuy={setSelectedBuy} onEditGroup={() => setEditingGroup(selectedGroup)} /> :
        showAllGroups ? <AllGroupsView groupRecords={groupRecords} buyRecords={buyRecords} userId={user.uid} onBack={() => setShowAllGroups(false)} onSelectGroup={setSelectedGroup} /> :
        selectedSubscription ? <SubscriptionDetailView subscription={selectedSubscription} userId={user.uid} onBack={() => setSelectedSubscription(null)} onRenew={(renewal) => { setSelectedSubscription(null); setRenewalSubscription(renewal); setNewItemType('subscription') }} /> :
        section === 'Home' ? <HomeView latestCash={cashRecords[0]} previousCash={cashRecords[1]} cashError={cashError} buyRecords={buyRecords} groupRecords={groupRecords} bankRecords={bankRecords} subscriptionRecords={subscriptionRecords} buyError={buyError} onSelectCash={setSelectedCash} onOpenExpenses={() => setSection('Spese')} onOpenStatement={() => setSection('Estratto Conto')} onOpenSubscriptions={() => { setSubscriptionFilter('expiring'); setSection('Abbonamenti') }} /> :
            section === 'Gestione Risparmi' ? <SavingsView cashRecords={cashRecords} onSelectCash={setSelectedCash} showHistory={showCashHistory} onShowHistoryChange={setShowCashHistory} /> :
                section === 'Spese' ? <ExpensesView buyRecords={buyRecords} groupRecords={groupRecords} error={buyError} onSelectGroup={(groupId) => setSelectedGroup(groupRecords.find((group) => (group.uid ?? group.id) === groupId))} onShowAllGroups={() => setShowAllGroups(true)} /> :
                section === 'Estratto Conto' ? <StatementView bankRecords={bankRecords} onSelectCategory={(category, selectedMonth, filter) => setSelectedStatementCategory({ category, selectedMonth, filter })} /> :
                    section === 'Abbonamenti' ? <SubscriptionsView key={subscriptionFilter} subscriptionRecords={subscriptionRecords} initialFilter={subscriptionFilter} onSelectSubscription={setSelectedSubscription} /> :
                    <SettingsView theme={theme} setTheme={setTheme} color={color} setColor={setColor} userId={user.uid} />
    return (
        <div
            className="app-shell">
            <header
                className="topbar">
                <button
                    className="icon-button"
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Apri menu">
                    <FiMenu />
                </button>
                <span
                    className="app-title">
                    My Gesture
                </span>
                <button className="icon-button quick-add-button" type="button" onClick={() => setQuickAddOpen(true)} aria-label="Aggiungi elemento">
                    <FiPlus />
                </button>
            </header>
            {quickAddOpen && <div className="quick-add-layer" onClick={() => setQuickAddOpen(false)}><div className="quick-add-dialog" role="dialog" aria-modal="true" aria-label="Aggiungi elemento" onClick={(event) => event.stopPropagation()}><h2>Aggiungi</h2><button type="button" onClick={() => { setNewItemType('cash'); setQuickAddOpen(false) }}><FiDollarSign className="quick-add-icon cash"/>Risparmi</button><button type="button" onClick={() => { setNewItemType('group'); setQuickAddOpen(false) }}><FiLayers className="quick-add-icon group"/>Gruppo</button><button type="button" onClick={() => { setNewItemType('buy'); setQuickAddOpen(false) }}><FiShoppingBag className="quick-add-icon buy"/>Spesa</button><button type="button" onClick={() => { setNewItemType('subscription'); setQuickAddOpen(false) }}><FiBell className="quick-add-icon subscription"/>Abbonamento</button><button type="button" onClick={() => { setNewItemType('statement-upload'); setQuickAddOpen(false) }}><FiUpload className="quick-add-icon upload"/>Carica Estratto Conto</button></div></div>}
            {menuOpen &&
                <div
                    className="menu-layer"
                    onClick={() => setMenuOpen(false)}>
                    <aside
                        className="side-menu"
                        onClick={(event) => event.stopPropagation()}>
                        <div
                            className="menu-heading">
                            <div className="menu-brand">
                                <span
                                    className="user-avatar"
                                    title={user.email}>
                                    {user.email?.charAt(0).toUpperCase()}
                                </span>
                                <span>My Gesture</span>
                            </div>
                            <button
                                className="icon-button"
                                onClick={() => setMenuOpen(false)}
                                aria-label="Chiudi menu">
                                <FiX />
                            </button>
                        </div>
                        <nav
                            aria-label="Navigazione principale">
                            {navigation.map(({ label, icon: Icon }) => <button
                                key={label}
                                className={section === label ? 'nav-item active' : 'nav-item'}
                                onClick={() => {
                                    setSection(label)
                                    setSelectedCash(null)
                                    setSelectedGroup(null)
                                    setSelectedBuy(null)
                                    setEditingGroup(null)
                                    setShowAllGroups(false)
                                    setNewItemType(null)
                                    setSelectedStatementCategory(null)
                                    setSelectedStatementRecord(null)
                                    setShowStatementCategoryTrend(false)
                                    setShowCashHistory(false)
                                    setSelectedSubscription(null)
                                    if (label === 'Abbonamenti') setSubscriptionFilter('active')
                                    setMenuOpen(false)
                                }}>
                                <Icon />
                                <span>{label}</span>
                                <FiChevronRight className="nav-arrow" />
                            </button>)
                            }
                        </nav>
                        <button
                            className="logout-button"
                            onClick={() => auth.signOut()}><FiLogOut />
                            Esci
                        </button>
                    </aside>
                </div>
            }
            <main
                className="home-content">
                {content}
            </main>
        </div>
    )
}
