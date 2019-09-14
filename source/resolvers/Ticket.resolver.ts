import { Arg, Mutation, Query, Resolver } from "type-graphql"

import axios from "axios"

import TicketModel, { Ticket } from "../entities/ticket"

import { AddTicketInput, ListTicketsInput, TicketInput } from "./types/Ticket.input"

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
    tickets.forEach(response => {
      if (response.title && response.imageUrl) {
        const ticket = new TicketModel(response)
        return ticket.saveFields()
      }
    })
    return tickets
  }

  @Mutation(() => Ticket)
  public async addTicket(@Arg("input") ticketInput: AddTicketInput): Promise<Ticket> {
    const ticket = new TicketModel(ticketInput)
    return ticket.saveFields()
  }
}
