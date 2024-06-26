import {
  NewIds,
  RawId,
  RawStream,
  Stream,
  StreamData,
  SymTracker,
} from "@shared/types"
import ObjectID from "bson-objectid"

import prisma from "../../prisma/client"
import { oidSchema, rawSchema, streamSchema } from "../utils/schemas"
import StreamUtils from "./AssetServices"

type WriteErrors = Array<{
  code: number
  keyValue: RawId
}>

export default class StreamServices {
  private streamData: StreamData = {
    streams: [],
    symtracker: {},
    tickers: {},
    tstreams: 0,
    tsyms: 0,
    usyms: 0,
  }

  async create(userId: string, symbols: string[]): Promise<Stream> {
    await streamSchema.validateAsync({ userId, symbols })
    const stream = await prisma.stream.create({
      data: {
        userId,
        symbols,
      },
    })

    return stream
  }

  async createMany(
    allstreams: RawStream[],
    newids: NewIds = {}
  ): Promise<NewIds> {
    await rawSchema.validateAsync(allstreams)
    const res = await prisma.$runCommandRaw({
      insert: "Stream",
      ordered: false,
      documents: allstreams,
    })

    const werr = res.writeErrors as WriteErrors

    if (werr) {
      const duplicates: RawStream[] = []

      werr.forEach((err) => {
        if (err.code === 11000) {
          const id = err.keyValue._id.$oid
          const stream = allstreams.find(
            (dupstream) => dupstream._id.$oid == id
          ) as RawStream

          newids[id] = ObjectID().toHexString()
          stream._id.$oid = newids[id]
          duplicates.push(stream)
        }
      })

      return this.createMany(duplicates, newids)
    }

    return newids
  }

  async read(userId: string): Promise<StreamData> {
    await oidSchema.validateAsync(userId)
    const streams = await prisma.stream.findMany({
      where: {
        userId,
      },
    })

    if (streams.length < 1) return this.streamData

    let usyms: string[] = []
    const allsyms = streams.flatMap((stream) => stream.symbols)
    const symtracker = allsyms.reduce((store: SymTracker, sym: string) => {
      store[sym] = store[sym] + 1 || 1
      if (store[sym] == 1) usyms.push(sym)
      return store
    }, {})
    const tsyms = allsyms.length
    const tstreams = streams.length
    const tickers = await new StreamUtils().getTickers(usyms)

    return {
      streams,
      symtracker,
      tickers,
      tstreams,
      tsyms,
      usyms: usyms.length,
    }
  }

  async update(id: string, symbols: string[]): Promise<Stream> {
    await streamSchema.validateAsync({ id, symbols })
    const stream = await prisma.stream.update({
      where: {
        id,
      },
      data: {
        symbols,
      },
    })

    return stream
  }

  async delete(stream_id: string): Promise<Stream> {
    await oidSchema.validateAsync(stream_id)
    const stream = await prisma.stream.delete({
      where: {
        id: stream_id,
      },
    })

    return stream
  }
}
