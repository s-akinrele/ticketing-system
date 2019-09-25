import { Arg, Mutation, Query, Resolver , Int} from "type-graphql"

import TicketModel, { Ticket, TicketMovie } from "../entities/ticket"

import { AddTicketInput, ListTicketsInput, TicketInput, AddTicketInputs} from "./types/Ticket.input"
import MovieModel from "../entities/movie"
import {queryAllData} from '../helpers/transformTicket'

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

  @Query(() => [TicketMovie])
  public async listTickets(@Arg("input") input: ListTicketsInput): Promise<TicketMovie[]> {
    const tickets = await TicketModel.find({date: { $lte : input.cursor.getTime()}}).sort({date: -1}).limit(input.limit)
   
    let resultsWithMovie: TicketMovie[] = []

    for(let i = 0; i<tickets.length; i++) {
      let movie = await MovieModel.find({Title: tickets[i].title}) || [];
      let movieInstance = movie[0] || null
      let ticketMovieInstance = new TicketMovie()
      ticketMovieInstance._id = tickets[i]._id
      ticketMovieInstance.movie = movieInstance
      ticketMovieInstance.title = tickets[i].title
      ticketMovieInstance.date = tickets[i].date
      ticketMovieInstance.genre = tickets[i].genre
      ticketMovieInstance.imageUrl = tickets[i].imageUrl
      ticketMovieInstance.price = tickets[i].price
      ticketMovieInstance.inventory = tickets[i].inventory
      resultsWithMovie.push(ticketMovieInstance)
    }

    return resultsWithMovie
  }

  @Query(() => [Ticket])
  public async fetchAndStoreCleanTickets(): Promise<AddTicketInput []> {
    const tickets = await queryAllData()

    const formattedTickets = tickets.filter(ticket => {
      return ticket.title && ticket.imageUrl
    })

    const ticketInputs: AddTicketInput[] = formattedTickets.map(formattedTicket => {
      let ticketInput = new AddTicketInput()
      return {...ticketInput, ...formattedTicket}
    })

    let formattedTicketInputs = new AddTicketInputs()
    formattedTicketInputs.tickets = ticketInputs

    this.bulkAddTickets(formattedTicketInputs)

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
