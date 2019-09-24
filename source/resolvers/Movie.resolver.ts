import { Arg, Mutation, Query, Resolver } from "type-graphql"
import axios from "axios"

import MovieModel, { Movie } from "../entities/movie"
import TicketModel, { Ticket } from "../entities/ticket"

import { AddMovieInput } from "./types/Movie.input"

@Resolver(() => Movie)
export class MovieResolver {

  @Query(() => [Movie])
  public async createMoviesForMatchingTickets(): Promise<Movie[]> {
    let tickets = await TicketModel.find()
    let links = tickets.map((ticket :any) => {
        let movieUrl = `${process.env.MOVIE_URL}/?t=${ticket.title}&apikey=${process.env.API_KEY}`
      return () => axios.get(movieUrl)
    });

    let movies: Movie[] = []
    links.forEach(async (link) => {
      let movie = await link()
      if (movie.data.Response === "True") {
        let movieModelInput = new AddMovieInput()
        movieModelInput = {...movieModelInput, ...movie.data}
        const newMovie = await this.addMovie(movieModelInput)
        movies.push(newMovie)
      }
    })

    return movies
  }

  @Mutation(() => Movie)
  public async addMovie(@Arg("input") movieInput: AddMovieInput): Promise<Movie> {
    const ticket = new MovieModel(movieInput)
    return ticket.save()
  }
}
