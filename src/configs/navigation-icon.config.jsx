import { PiUserCircleDuotone } from 'react-icons/pi'

const NavIcon = ({ src, alt }) => (
    <img
        src={src}
        alt={alt}
        className="w-5 h-5 dark:invert"
    />
)

const navigationIcon = {
    home: <NavIcon src="/img/logo/dashboard.png" alt="Home" />,
    gear: <NavIcon src="/img/logo/backpack.png" alt="My Gear" />,
    food: <NavIcon src="/img/logo/food.png" alt="My Food" />,
    trips: <NavIcon src="/img/logo/trips.png" alt="My Trips" />,
    carlo: <NavIcon src="/img/logo/carlo.png" alt="Carlo" />,
    profile: <PiUserCircleDuotone />,
}

export default navigationIcon
