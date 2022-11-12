export default function PeepoHeart({ onClick, enabled }) {
    return <i onClick={onClick} className={`${enabled ? 'fa-solid text-red-500' : 'fa-regular'} fa-heart p-8 hover:text-red-500 hover:animate-pulse active:text-red-900 w-full`}></i>
}