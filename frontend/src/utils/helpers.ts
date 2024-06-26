import {
  NewIds,
  RawStream,
  Stream,
  StreamData,
  SymTracker,
  Tickers,
} from "@shared/types"
import { QueryClient } from "@tanstack/react-query"
import { AxiosError, AxiosResponse } from "axios"
import { SyntheticEvent } from "react"
import * as yup from "yup"
import { NotifType } from "../components/views/Dashboard/Notification"
import api from "../services/api"

interface Newticks {
  syms: string[]
  tickers: Tickers
  uniquesCount: SymTracker
}

interface GuestStreamData {
  queriable: Omit<StreamData, "tickers">
  symbols: string[]
  rawstreams: RawStream[]
  newticks: Newticks
}

interface FilteredStreams {
  streams: Stream[]
  oldstream: Stream | null
}

export interface InputData {
  name: string
  email: string
  password: string
}

interface NotifReturn {
  message: string
  type: Exclude<NotifType, "loading">
}

export const local = {
  token: "u:token",
  streams: "u:streams",
  window: "u:prefWindow",
  joined: "u:joinDate",
  expStreams: "u:exportStreams",
  expPrompt: "u:exportPrompt",
  delPrompt: "u:delPrompt",
}

export const messages: { [key: string]: string } = {
  name: "Name must contain only word characters.",
  email: "Please enter a valid email.",
  pass: "Passwords must include uppercase, lowercase and digit characters",
  passmin: "Password must have at least 8 characters",
  cpassword: "Passwords must match",
}

const passRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?!.*\s).{8,}$/

const userSchema = yup
  .object({
    name: yup.string().matches(/\w/, messages.name).required(),
    email: yup
      .string()
      .email(messages.email)
      .required("Email must not be empty"),
    password: yup
      .string()
      .min(8, messages.passmin)
      .matches(passRegex, messages.pass),
  })
  .noUnknown(true, "Form must not contain invalid fields")

const schemas = {
  auth: userSchema.pick(["email", "password"]).noUnknown(true),
  password: userSchema.pick(["password"]).noUnknown(true),
  signup: userSchema,
}

const formatTicker = (symbol: string): string => {
  const ticker = (symbol + "@ticker").toLowerCase()
  return ticker
}

const TICKER_KEYS = ["average", "change", "last", "pchange"]

const formatSymbols = (
  store: Tickers,
  formatter: Intl.NumberFormat
): Tickers => {
  const formatted: Tickers = {}
  for (const sym in store) {
    const ticker = store[sym]

    const [average, change, last, pchange] = TICKER_KEYS.map((key) => {
      return formatter.format(ticker[key])
    })

    formatted[sym] = { ...ticker, average, change, last, pchange }
  }

  return formatted
}

const validateForm = (
  input: InputData,
  schema: "signup" | "password" | "auth" = "auth"
): void | string => {
  try {
    schemas[schema].validateSync(input)
  } catch (e) {
    throw new Error((e as yup.ValidationError).errors[0])
  }
}

const stopPropagation = (e: SyntheticEvent) => {
  e.stopPropagation()
}

const validateField = (
  property: string,
  input: Partial<InputData>
): void | string => {
  try {
    userSchema.validateSyncAt(property, input)
  } catch (e) {
    const message = (e as yup.ValidationError).errors[0]
    throw message
  }
}

const genGuestStreams = (
  uid: string,
  tracker: SymTracker = {}
): GuestStreamData => {
  const allsyms: string[] = []
  const streams: Stream[] =
    JSON.parse(localStorage.getItem(local.streams)) || []
  const rawstreams: RawStream[] = streams.map((stream) => {
    allsyms.push(...stream.symbols)
    return {
      _id: { $oid: stream.id },
      userId: uid,
      symbols: stream.symbols,
    }
  })

  const newticks = addTicks(allsyms, tracker)
  const tstreams = streams.length
  const symbols = Object.keys(tracker)

  return {
    queriable: {
      streams,
      tstreams,
      tsyms: allsyms.length,
      usyms: symbols.length,
      symtracker: tracker,
    },
    symbols,
    rawstreams,
    newticks,
  }
}

const impGuestStreams = async (
  qc: QueryClient,
  uid: string
): Promise<NotifReturn> => {
  let rawstreams: RawStream[]
  let paramTicks: Newticks
  let guestSymTotal: number = 0

  qc.setQueryData<StreamData>(["streams"], (curr) => {
    let streams: Stream[] = [...curr.streams]
    const createdBy = curr.streams[0]?.userId

    const {
      queriable,
      rawstreams: rstreams,
      newticks,
    } = genGuestStreams(uid, {
      ...curr.symtracker,
    })

    rawstreams = rstreams
    paramTicks = newticks

    if (createdBy != "guest") {
      guestSymTotal = queriable.tsyms
      streams = queriable.streams.concat(streams)
      queriable.tstreams += curr.tstreams
      queriable.tsyms += curr.tsyms
    }
    setPageState(paramTicks.syms, "newsyms")

    const tickers = { ...curr.tickers, ...newticks.tickers }

    return {
      ...queriable,
      streams,
      tickers,
    }
  })

  localStorage.removeItem(local.expStreams)

  return api
    .post<NewIds>("/streams/import", {
      streams: rawstreams,
    })
    .then((res: AxiosResponse<NewIds>): NotifReturn => {
      localStorage.removeItem(local.streams)
      const dupids = Object.keys(res.data)

      if (dupids.length > 0)
        qc.setQueryData<StreamData>(["streams"], (curr) => {
          const streams = curr.streams.map<Stream>((stream) => {
            const id = dupids.includes(stream.id)
              ? res.data[stream.id]
              : stream.id

            return { id, userId: stream.userId, symbols: stream.symbols }
          })
          return { streams, ...curr }
        })

      return {
        message: "Data exported successfully",
        type: "success",
      }
    })
    .catch((e: AxiosError<string>): NotifReturn => {
      const rawId = rawstreams[0]._id.$oid

      qc.setQueryData<StreamData>(["streams"], (data) => {
        const symtracker = { ...data.symtracker }
        let { tsyms, usyms } = data

        const delsyms = []
        paramTicks.syms.forEach((tick) => {
          const key = tick.split("@")[0].toUpperCase()
          const count = symtracker[key] - 1 || 0

          if (count < paramTicks.uniquesCount[key]) {
            delete symtracker[key]
            delsyms.push(tick)
            usyms -= 1
          }
        })
        setPageState(delsyms, "delsyms")

        const streams = [...data.streams]
        const rawstart = data.streams.findIndex((stream) => stream.id === rawId)
        streams.splice(rawstart, rawstart + rawstreams.length)

        return {
          ...data,
          symtracker,
          streams,
          tstreams: streams.length,
          tsyms: tsyms - guestSymTotal,
          usyms,
        }
      })
      return {
        message:
          e.response?.data ||
          "Your streams failed to be exported. Please try again",
        type: "error",
      }
    })
}

const addTicks = (
  symbols: string[],
  symtracker: SymTracker,
  tickers?: Tickers
): Newticks => {
  const newticks = symbols.reduce<Newticks>(
    (store, sym) => {
      symtracker[sym] = symtracker[sym] + 1 || 1
      store.uniquesCount[sym] = symtracker[sym]

      if (symtracker[sym] == 1) {
        store.syms.push(formatTicker(sym))
        const tickstamp = new Date().getTime()
        store.tickers[sym] = tickers?.[sym] ?? {
          average: "0",
          last: "0",
          pchange: "0",
          change: "0",
          volume: 0,
          open: tickstamp,
          close: tickstamp,
          qvolume: 0,
          trades: 0,
        }
      }
      return store
    },
    { syms: [], tickers: {}, uniquesCount: {} }
  )
  return newticks
}

const delTicks = (oldsymbols: string[], symtracker: SymTracker): string[] => {
  const delticks = oldsymbols.reduce((store: string[], oldsym) => {
    symtracker[oldsym] -= 1
    if (symtracker[oldsym] < 1) {
      delete symtracker[oldsym]
      store.push(formatTicker(oldsym))
    }
    return store
  }, [])

  return delticks
}

const setPageState = (ticks: string[], type: "newsyms" | "delsyms") => {
  const url = new URL(window.location.origin + window.location.pathname)
  url.searchParams.set(type, JSON.stringify(ticks))
  history.replaceState(history.state, "", url)
}

const createTicksParameter = (ticks: string[], key: string): string => {
  if (ticks.length < 1) return ""
  const queryName = `${key}=`
  const encoded = encodeURIComponent(JSON.stringify(ticks))
  const tickParam = `${queryName}${encoded}`
  return tickParam
}

const filterStreams = (id: string, streams: Stream[]): FilteredStreams => {
  let oldstream: Stream
  const newstreams = streams.filter((stream) => {
    if (stream.id === id) oldstream = stream
    return stream.id !== id
  })
  return { streams: newstreams, oldstream }
}

export {
  addTicks,
  createTicksParameter,
  delTicks,
  filterStreams,
  formatSymbols,
  formatTicker,
  genGuestStreams,
  impGuestStreams,
  setPageState,
  stopPropagation,
  validateField,
  validateForm,
}
