import {
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'

const navigationConfig = [
    {
        key: 'home',
        path: '/home',
        title: 'Dashboard',
        translateKey: 'nav.home',
        icon: 'home',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'gear',
        path: '/gear',
        title: 'Gear',
        translateKey: 'nav.gear',
        icon: 'gear',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'food',
        path: '/food',
        title: 'Food',
        translateKey: 'nav.food',
        icon: 'food',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'trips',
        path: '/trips',
        title: 'Trips',
        translateKey: 'nav.trips',
        icon: 'trips',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'carlo',
        path: '/carlo',
        title: 'Carlo',
        translateKey: 'nav.carlo',
        icon: 'carlo',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
]

export default navigationConfig
