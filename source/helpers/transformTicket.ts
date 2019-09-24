
import axios from "axios"
import {Ticket} from '../entities/ticket'

type TicketResults = {
  data: [Ticket]
}

export const cleanResponse = (results: any[]) => {
  return results.map(({image, _id, genre, ...result}) => {
    let cleanResult = {...result, imageUrl: image, genre: genre && genre.split('|')}
    return cleanResult
  })
}

export const queryAllData = async(skip = 0): Promise<Ticket[]> => {
  const limit = 100
  const results: TicketResults = await axios.get(`${process.env.TICKET_URL}?skip=${skip}&limit=${limit}`)
  if (!results.data.length) {
    return cleanResponse(results.data)
  }
  return cleanResponse(results.data).concat(await queryAllData(skip + limit))
}
