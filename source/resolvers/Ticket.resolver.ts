import { Arg, Mutation, Query, Resolver } from "type-graphql"

import axios from "axios"

import TicketModel, { Ticket } from "../entities/ticket"

import { AddTicketInput, ListTicketsInput, TicketInput, AddTicketInputs} from "./types/Ticket.input"

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
  public async fetchAndStoreCleanTickets(): Promise<Ticket[]> {
    const cleanResponse = (results: any[]) => {
      return results.map(result => {
        let cleanResult = {...result, imageUrl: result.image, genre: result.genre && result.genre.split('|')}
        delete(cleanResult.image)
        delete(cleanResult._id)
        return cleanResult
      })
    }

    const queryAllData = async(skip = 0): Promise<any[]> => {
      const limit = 100
      const results: any = await axios.get(`https://us-central1-bonsai-interview-endpoints.cloudfunctions.net/movieTickets?skip=${skip}&limit=${limit}`)
      if (results.data.length < 1) {
        return cleanResponse(results.data)
      } else {
        skip += limit
        return cleanResponse(results.data).concat(await queryAllData(skip))
      }
    }

    const tickets = await queryAllData()

    const formattedTickets = tickets.filter(ticket => {
      return ticket.title && ticket.imageUrl
    })

    const ticketInputs: AddTicketInput[] = formattedTickets.map(x => {
      let y = new AddTicketInput()
      y.title = x.title
      y.genre = x.genre
      y.imageUrl = x.imageUrl
      y.price = x.price
      y.inventory = x.inventory
      y.date = x.date
      return y
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
}
