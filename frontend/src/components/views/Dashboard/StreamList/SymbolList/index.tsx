import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Stream, StreamData, SymTracker } from "@shared/types"
import { QueryClient } from "@tanstack/react-query"
import ObjectID from "bson-objectid"
import { ChangeEvent, MouseEvent, Suspense, useState } from "react"
import {
  Await,
  defer,
  redirect,
  useLoaderData,
  useLocation,
} from "react-router"
import { Form } from "react-router-dom"
import api from "../../../../../services/api"
import { getAssets } from "../../../../../utils/datafetching"
import {
  addTicks,
  createTicksParameter,
  delTicks,
  filterStreams,
  local,
} from "../../../../../utils/helpers"
import ModalContainer from "../../../../ModalContainer"
import CancellableAction from "../../CancellableAction"
import SubmitAction from "../../SubmitAction"
import { UserParams } from "../../UserSettings"
import ActionAnimation from "../ActionAnimation"
import Pairs from "./Pairs"
import SkeletonPairs from "./SkeletonPairs"
import styles from "./styles.module.scss"

interface TickSubs {
  newsyms: string[]
  delsyms: string[]
  redirect?: boolean
}

interface DeferredPairs {
  pairs: Promise<string[]>
}

export const assetsLoader = () => {
  return defer({ pairs: getAssets() })
}

const createGStream = (symbols: string[]): { data: Stream } => {
  const streams = JSON.parse(localStorage.getItem(local.streams)) || []
  const id = ObjectID().toHexString()

  const newStream = {
    userId: "guest",
    id,
    symbols,
  }

  streams.push(newStream)
  localStorage.setItem(local.streams, JSON.stringify(streams))
  return { data: newStream }
}

export const upsertStream =
  (qc: QueryClient) =>
  async ({ request, params }: UserParams) => {
    const method = request.method.toLowerCase() as "put" | "post"
    const formData = await request.formData()
    const isGuest = localStorage.getItem(local.token) === "guest"
    const config: Partial<Stream> = {
      symbols: formData.getAll("selected") as string[],
    }
    if (params.id) config.id = params.id

    const { data: stream } = isGuest
      ? createGStream(config.symbols)
      : await api[method]<Stream>("/streams", config)

    let { newsyms, delsyms }: TickSubs = { newsyms: [], delsyms: [] }

    qc.setQueryData<StreamData>(["streams"], (cached): StreamData => {
      const { streams, oldstream } = filterStreams(config.id, cached.streams)
      const symtracker: SymTracker = { ...cached.symtracker }
      const tstreams = streams.unshift(stream)

      const { syms, tickers: newtickers } = addTicks(
        stream.symbols,
        symtracker,
        cached.tickers
      )
      newsyms = syms

      if (method === "put") {
        delsyms = delTicks(oldstream.symbols, symtracker)
      }

      const usyms = cached.usyms + newsyms.length - delsyms.length
      const tsyms =
        cached.tsyms - (oldstream?.symbols?.length || 0) + stream.symbols.length
      const tickers = Object.assign(cached.tickers, newtickers)

      return {
        streams,
        symtracker,
        tickers,
        tstreams,
        usyms,
        tsyms,
      }
    })

    const [sub, unsub] = [
      createTicksParameter(newsyms, "newsyms"),
      createTicksParameter(delsyms, "delsyms"),
    ]

    return redirect(`/dashboard?${sub}&${unsub}`)
  }

export interface PageState {
  pathname: string
  state: { verified: boolean; symbols: string[] }
}

export default function SymbolList() {
  const { pairs } = useLoaderData() as DeferredPairs
  const { state: pagestate, pathname }: PageState = useLocation()
  const [selected, setSelected] = useState<string[]>(pagestate?.symbols || [])
  const [search, setSearch] = useState<string>("")

  const handlePush = (event: MouseEvent) => {
    const newsym = (event.target as HTMLLIElement).textContent
    const hasDuplicate = selected.some((symbol) => symbol == newsym)

    if (selected.length < 5 && !hasDuplicate) {
      setSelected((prev) => [...prev, newsym])
    }
  }

  const handleRemoval = (delsym: string) => {
    setSelected((prev) => prev.filter((sym) => sym !== delsym))
  }

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
  }

  return (
    <ModalContainer id={styles.symbolModal} predecessor="/dashboard">
      <section className={styles.modal}>
        <header id={styles.modalHeader}>
          <h1> Select up to 5 assets </h1>
          <label id={styles.searchBox}>
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              name="search"
              type="text"
              placeholder="Search"
              value={search}
              autoFocus
              onChange={handleSearch}
            />
          </label>
        </header>

        <Form
          id={styles.symbolOptions}
          action={pathname}
          method={pagestate?.symbols ? "put" : "post"}
        >
          <div id={styles.activeItems}>
            {selected?.map((symbol) => {
              return (
                <div
                  id={styles.activeItem}
                  key={symbol}
                  onClick={() => handleRemoval(symbol)}
                >
                  <input
                    type="text"
                    data-cy="selectedAsset"
                    value={symbol}
                    readOnly
                    name="selected"
                    className={styles.selected}
                  />
                  <button type="button" aria-label={`Remove ${symbol}`}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              )
            })}
          </div>

          <CancellableAction>
            <ActionAnimation actpath={pathname}>
              <SubmitAction disabled={selected.length < 1}>
                {pagestate?.symbols ? "Update" : "Create"}
              </SubmitAction>
            </ActionAnimation>
          </CancellableAction>
        </Form>
        <Suspense fallback={<SkeletonPairs />}>
          <Await resolve={pairs} errorElement={<p>Error!</p>}>
            {(pairs: string[]) => (
              <ul id={styles.symbolList}>
                <Pairs pairs={pairs} search={search} handlePush={handlePush} />
              </ul>
            )}
          </Await>
        </Suspense>
      </section>
    </ModalContainer>
  )
}
