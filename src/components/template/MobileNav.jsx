import { useState, Suspense, lazy } from 'react'
import classNames from 'classnames'
import Drawer from '@/components/ui/Drawer'
import NavToggle from '@/components/shared/NavToggle'
import SideNavUserSection from '@/components/template/SideNavUserSection'
import { DIR_RTL } from '@/constants/theme.constant'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import useNavigation from '@/utils/hooks/useNavigation'
import useTheme from '@/utils/hooks/useTheme'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import queryRoute from '@/utils/queryRoute'
import appConfig from '@/configs/app.config'
import { usePathname } from 'next/navigation'

const VerticalMenuContent = lazy(
    () => import('@/components/template/VerticalMenuContent'),
)

const MobileNavToggle = withHeaderItem(NavToggle)

const MobileNav = ({ translationSetup = appConfig.activeNavTranslation }) => {
    const [isOpen, setIsOpen] = useState(false)

    const handleOpenDrawer = () => {
        setIsOpen(true)
    }

    const handleDrawerClose = () => {
        setIsOpen(false)
    }

    const pathname = usePathname()

    const route = queryRoute(pathname)

    const currentRouteKey = route?.key || ''

    const direction = useTheme((state) => state.direction)

    const { session } = useCurrentSession()

    const { navigationTree } = useNavigation()

    return (
        <>
            <div
                className="text-2xl block lg:hidden"
                onClick={handleOpenDrawer}
            >
                <MobileNavToggle toggled={isOpen} />
            </div>
            <Drawer
                title="Navigation"
                isOpen={isOpen}
                bodyClass={classNames('p-0 flex flex-col h-full')}
                width={330}
                placement={direction === DIR_RTL ? 'right' : 'left'}
                onClose={handleDrawerClose}
                onRequestClose={handleDrawerClose}
            >
                <Suspense fallback={<></>}>
                    {isOpen && (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto">
                                <VerticalMenuContent
                                    collapsed={false}
                                    navigationTree={navigationTree}
                                    routeKey={currentRouteKey}
                                    userAuthority={session?.user?.authority || []}
                                    translationSetup={translationSetup}
                                    direction={direction}
                                    onMenuItemClick={handleDrawerClose}
                                />
                            </div>
                            <SideNavUserSection onItemClick={handleDrawerClose} />
                        </div>
                    )}
                </Suspense>
            </Drawer>
        </>
    )
}

export default MobileNav
