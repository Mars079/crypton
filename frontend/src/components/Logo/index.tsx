import styles from "./styles.module.scss"
interface LogoProps {
  isError?: boolean
}

export default function Logo({ isError }: LogoProps) {
  return (
    <h1 className={styles.logo} id={`${isError ? styles.error : ""}`}>
      Crypt
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_tracerCarrier" />
        <g id="SVGRepo_iconCarrier">
          <path
            d="M11 7C11 6.44772 10.5523 6 10 6C9.44772 6 9 6.44772 9 7V7.5H8C7.44772 7.5 7 7.94772 7 8.5C7 9.05228 7.44772 9.5 8 9.5H9V14.5H8C7.44772 14.5 7 14.9477 7 15.5C7 16.0523 7.44772 16.5 8 16.5H9V17C9 17.5523 9.44772 18 10 18C10.5523 18 11 17.5523 11 17V16.5H12V17C12 17.5523 12.4477 18 13 18C13.5523 18 14 17.5523 14 17V16.4641C14.6559 16.3676 15.2144 16.0796 15.6304 15.6428C16.136 15.1119 16.375 14.4201 16.375 13.75C16.375 13.1385 16.176 12.5089 15.7569 12C16.176 11.4911 16.375 10.8615 16.375 10.25C16.375 9.57995 16.136 8.88812 15.6304 8.35722C15.2144 7.92041 14.6559 7.63242 14 7.53587V7C14 6.44772 13.5523 6 13 6C12.4477 6 12 6.44772 12 7V7.5H11V7ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12Z"
            fill="#008000"
          />
          <path
            d="M11 11V9.5H13.5C13.8768 9.5 14.0752 9.62431 14.1821 9.73653C14.3015 9.86188 14.375 10.0451 14.375 10.25C14.375 10.4549 14.3015 10.6381 14.1821 10.7635C14.0752 10.8757 13.8768 11 13.5 11H11Z"
            fill="#008000"
          />
          <path
            d="M13.5 14.5C13.8768 14.5 14.0752 14.3757 14.1821 14.2635C14.3015 14.1381 14.375 13.9549 14.375 13.75C14.375 13.5451 14.3015 13.3619 14.1821 13.2365C14.0752 13.1243 13.8768 13 13.5 13H11V14.5H13.5Z"
            fill="#008000"
          />
        </g>
      </svg>
      n
    </h1>
  )
}
