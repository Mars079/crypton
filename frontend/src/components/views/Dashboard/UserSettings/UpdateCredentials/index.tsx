import { useLocation, useNavigate } from "react-router"
import api from "../../../../../services/api"
import { useLogout } from "../../../../../utils/customHooks"
import { InputData } from "../../../../../utils/helpers"
import AuthForm from "../../../../AuthForm"
import ModalContainer from "../../../../ModalContainer"
import CloseModal from "../../../../ModalContainer/CloseModal"
import styles from "./styles.module.scss"

interface CredProps {
  type: string
}
interface formMessages {
  email: string
  password: string
  delete: string
}

const formMessages: formMessages = {
  email: "A validation code will be sent to your new email address.",
  password: "Type in your new password",
  delete: "This will permanently delete all your data from our servers.",
}

interface CredentialsState {
  id: string
  email: string
  verified: boolean
}
export default function UpdateCredentials({ type }: CredProps) {
  const { state: user }: { state: CredentialsState } = useLocation()
  const handleLogout = useLogout(user.verified)
  const navigate = useNavigate()

  const toValidation = (email: string, type?: "email" | "password") => {
    navigate("/dashboard/settings/validate", {
      state: {
        id: user.id,
        email,
        type,
      },
    })
  }

  const requests = {
    email: async (input: InputData) => {
      await api.put("/user/email", {
        newmail: input.email,
        password: input.password,
      })
      toValidation(input.email)
    },
    password: async (input: InputData) => {
      await api.put("/user/password", {
        email: user.email,
        password: input.password,
      })
      toValidation(user.email, "password")
    },
    delete: async (input: InputData) => {
      await api.delete("/user", {
        data: {
          password: input.password,
        },
      })
      handleLogout()
    },
  }

  return (
    <ModalContainer id="innerModal" predecessor="/dashboard/settings">
      <div id="credModalForm">
        <header id={styles.credHeader}>
          <h3 id={styles.credTitle}> {formMessages[type]} </h3>
          <CloseModal predecessor={`/dashboard/settings`} />
        </header>
        <AuthForm
          exfields={type === "email" ? ["email"] : []}
          submit={requests[type]}
          action={type === "delete" ? "Delete user" : `Update ${type}`}
        />
      </div>
    </ModalContainer>
  )
}
