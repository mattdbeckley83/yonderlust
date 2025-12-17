import authRoute from './authRoute'

export const protectedRoutes = {
    '/home': {
        key: 'home',
        authority: [],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
}

export const publicRoutes = {
    '/dashboard': {
        key: 'dashboard',
        authority: [],
    },
}

export const authRoutes = authRoute
