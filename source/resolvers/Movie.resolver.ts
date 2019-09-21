import { Arg, Mutation, Query, Resolver } from "type-graphql"
import axios from "axios"

import MovieModel, { Movie } from "../entities/movie"

import { AddMovieInput } from "./types/Movie.input"

@Resolver(() => Movie)
export class MovieResolver {
  @Mutation(() => Movie)
  public async addMovie(@Arg("input") movieInput: AddMovieInput): Promise<Movie> {
    const ticket = new MovieModel(movieInput)
    return ticket.save()
  }
}
