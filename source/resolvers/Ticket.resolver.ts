import { Arg, Mutation, Query, Resolver , Int} from "type-graphql"

import axios from "axios"

import TicketModel, { Ticket, TicketMovie } from "../entities/ticket"

import { AddTicketInput, ListTicketsInput, TicketInput, AddTicketInputs} from "./types/Ticket.input"
import MovieModel, { Movie } from "../entities/movie"


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
  const results: TicketResults = await axios.get(`${process.env.TICKET_URL}?skip=${skip}&limit=${limit}`)
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

  @Query(() => [TicketMovie])
  public async listTickets(@Arg("input") input: ListTicketsInput): Promise<TicketMovie[]> {
    const tickets = await TicketModel.find({})
    const result = tickets
      .filter(ticket => ticket.date.getTime() < input.cursor.getTime())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, input.limit)

    let resultsWithMovie: TicketMovie[] = []

    for(let i = 0; i<result.length; i++) {
      let movie = await MovieModel.find({Title: result[i].title}) || [];
      let movieInstance = movie[0] || null
      let ticketMovieInstance = new TicketMovie()
      ticketMovieInstance._id = result[i]._id
      ticketMovieInstance.movie = movieInstance
      ticketMovieInstance.title = result[i].title
      ticketMovieInstance.date = result[i].date
      ticketMovieInstance.genre = result[i].genre
      ticketMovieInstance.imageUrl = result[i].imageUrl
      ticketMovieInstance.price = result[i].price
      ticketMovieInstance.inventory = result[i].inventory
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
