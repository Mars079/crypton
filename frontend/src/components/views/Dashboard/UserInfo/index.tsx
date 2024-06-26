import { StreamData, UIUser } from "@shared/types"
import { useQuery } from "@tanstack/react-query"
import { memo } from "react"
import { getGuestUser, getUser } from "../../../../utils/datafetching"
import FullDate from "./FullDate"
import styles from "./styles.module.scss"

export const userQuery = (verified: boolean) => ({
  queryKey: ["user"],
  queryFn: async () => {
    const user = verified ? getUser() : getGuestUser()
    return user
  },
})

interface InfoProps extends Pick<StreamData, "tstreams" | "tsyms" | "usyms"> {
  initialUser: UIUser
}

function UserInfo({ initialUser, tsyms, tstreams, usyms }: InfoProps) {
  const { data: user } = useQuery({
    ...userQuery(initialUser.verified),
    initialData: initialUser,
    staleTime: 3600000,
  })

  return (
    <section className={`${styles.userData} ${styles.panel}`}>
      <h2
        className={`${styles.infoItem} ${styles.name}`}
        aria-label="name"
        data-cy="username"
      >
        {user?.name}
      </h2>
      <div className={styles.userInfo}>
        <FullDate
          hour={false}
          title="Joined at"
          style={styles.infoItem}
          date={user.createdAt}
        />

        <p className={styles.infoItem}>
          Streams: <span data-cy="infoItem"> {tstreams} </span>
        </p>
        <p className={styles.infoItem}>
          Assets: <span data-cy="infoItem"> {tsyms} </span>
        </p>
        <p className={styles.infoItem}>
          Unique assets: <span data-cy="infoItem"> {usyms} </span>
        </p>
      </div>
    </section>
  )
}

export default memo(UserInfo)
