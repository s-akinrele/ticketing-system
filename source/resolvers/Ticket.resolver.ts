import { Arg, Mutation, Query, Resolver , Int} from "type-graphql"

import axios from "axios"

import TicketModel, { Ticket } from "../entities/ticket"

import { AddTicketInput, ListTicketsInput, TicketInput, AddTicketInputs} from "./types/Ticket.input"
import MovieModel from "../entities/movie"

type TicketResults = {
  data: [Ticket]
}

const cleanResponse = (results: any[]) => {
  return results.map(({image, _id, genre, ...result}) => {
    let cleanResult = {...result, imageUrl: image, genre: genre && genre.split('|')}
    return cleanResult
  })
}

const queryAllData = async(skip = 0): Promise<Ticket[]> => {
  const limit = 100
  const results: TicketResults = await axios.get(`https://us-central1-bonsai-interview-endpoints.cloudfunctions.net/movieTickets?skip=${skip}&limit=${limit}`)
  if (!results.data.length) {
    return cleanResponse(results.data)
  }
  return cleanResponse(results.data).concat(await queryAllData(skip + limit))
}

@Resolver(() => Ticket)
export class TicketResolver {
  @Query(() => Ticket, { nullable: true })
  public async ticket(@Arg("input") ticketInput: TicketInput): Promise<Ticket> {
    const ticket = await TicketModel.findById(ticketInput.id)
    if (!ticket) {
      throw new Error("No ticket found!")
    }
    return ticket
  }

  @Query(() => [Ticket])
  public async listTickets(@Arg("input") input: ListTicketsInput): Promise<Ticket[]> {
    const tickets = await TicketModel.find({})
    const result = tickets
      .filter(ticket => ticket.date.getTime() < input.cursor.getTime())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, input.limit)
    return result
  }

  @Query(() => [Ticket])
  public async fetchAndStoreCleanTickets(): Promise<AddTicketInput []> {
    const tickets = await queryAllData()

    const formattedTickets = tickets.filter(ticket => {
      return ticket.title && ticket.imageUrl
    })

    const ticketInputs: AddTicketInput[] = formattedTickets.map(x => {
      let y = new AddTicketInput()
      return {...y, ...x}
    })

    let d = new AddTicketInputs()
    d.tickets = ticketInputs

    this.bulkAddTickets(d)

    return formattedTickets
  }

  @Mutation(() => Ticket)
  public async addTicket(@Arg("input") ticketInput: AddTicketInput): Promise<Ticket> {
    const ticket = new TicketModel(ticketInput)
    return ticket.saveFields()
  }

  @Mutation(() => [Ticket])
  public async bulkAddTickets(@Arg("tickets") ticket: AddTicketInputs): Promise<Ticket[]> {
    return await TicketModel.insertMany(ticket.tickets)
  }

  @Query(() => [Ticket])
  public async ticketWithoutMatchingMovies(@Arg("limit", type => Int, { defaultValue: 10 }) limit: number, @Arg("limit", type => Int, { defaultValue: 1 }) page: number): Promise<Ticket[]> {
    let tickets = await TicketModel.find()
    let ticketsWithoutMovies: Ticket[] = []
    for (let i = 0; i < tickets.length; i++) {
      let ticket = tickets[i]
      let movie = await MovieModel.find({Title: ticket.title})
      if (movie.length < 1) {
        ticketsWithoutMovies.push(ticket)
      }
    }
    return ticketsWithoutMovies.slice(page*limit, (page * limit) + limit)
  }
}
