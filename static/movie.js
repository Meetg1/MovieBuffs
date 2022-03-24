my_api_key = "1cf9bf99f5a3d0fa43f7dd0effa15996";

// will be invoked when clicking on the recommended movie cards
function goToMoviePage(e) {
  $("#loader").fadeIn();
  console.log(e);
  var movie_id = e.getAttribute("title");
  get_movie_details(movie_id, my_api_key);
}

// get all the details of the movie using the movie id.
function get_movie_details(movie_id, my_api_key) {
  $.ajax({
    type: "GET",
    url:
      "https://api.themoviedb.org/3/movie/" +
      movie_id +
      "?api_key=" +
      my_api_key,
    success: function (movie_details) {
      show_details(movie_details, my_api_key, movie_id);
    },
    error: function (error) {
      alert("API Error! - " + error);
      $("#loader").delay(500).fadeOut();
    },
  });
}

// passing all the details to python's flask for displaying and scraping the movie reviews using imdb id
function show_details(movie_details, my_api_key, movie_id) {
  var imdb_id = movie_details.imdb_id;
  var poster;
  if (movie_details.poster_path) {
    poster = "https://image.tmdb.org/t/p/original" + movie_details.poster_path;
  } else {
    poster = "static/default.jpg";
  }
  var title = movie_details.title;
  var overview = movie_details.overview;
  var genres = movie_details.genres;
  var rating = movie_details.vote_average;
  var vote_count = movie_details.vote_count;
  var release_date = movie_details.release_date;
  var runtime = parseInt(movie_details.runtime);
  var status = movie_details.status;
  var genre_list = [];
  for (var genre in genres) {
    genre_list.push(genres[genre].name);
  }
  var my_genre = genre_list.join(", ");
  if (runtime % 60 == 0) {
    runtime = Math.floor(runtime / 60) + " hour(s)";
  } else {
    runtime =
      Math.floor(runtime / 60) + " hour(s) " + (runtime % 60) + " min(s)";
  }

  // calling `get_movie_cast` to get the top cast for the queried movie
  movie_cast = get_movie_cast(movie_id, my_api_key);

  // calling `get_individual_cast` to get the individual cast details
  ind_cast = get_individual_cast(movie_cast, my_api_key);

  //   // calling `get_recommendations` to get the recommended movies for the given movie id from the TMDB API
  //   recommendations = get_recommendations(movie_id, my_api_key);

  details = {
    title: title,
    cast_ids: JSON.stringify(movie_cast.cast_ids),
    cast_names: JSON.stringify(movie_cast.cast_names),
    cast_chars: JSON.stringify(movie_cast.cast_chars),
    cast_profiles: JSON.stringify(movie_cast.cast_profiles),
    cast_bdays: JSON.stringify(ind_cast.cast_bdays),
    cast_bios: JSON.stringify(ind_cast.cast_bios),
    cast_places: JSON.stringify(ind_cast.cast_places),
    imdb_id: imdb_id,
    poster: poster,
    genres: my_genre,
    overview: overview,
    rating: rating,
    vote_count: vote_count.toLocaleString(),
    rel_date: release_date,
    release_date: new Date(release_date)
      .toDateString()
      .split(" ")
      .slice(1)
      .join(" "),
    runtime: runtime,
    status: status,
    // rec_movies: JSON.stringify(recommendations.rec_movies),
    // rec_posters: JSON.stringify(recommendations.rec_posters),
    // rec_movies_org: JSON.stringify(recommendations.rec_movies_org),
    // rec_year: JSON.stringify(recommendations.rec_year),
    // rec_vote: JSON.stringify(recommendations.rec_vote),
  };

  $.ajax({
    type: "POST",
    data: details,
    url: "/movie",
    dataType: "html",
    complete: function () {
      $("#loader").delay(500).fadeOut();
    },
    success: function (response) {
      $(".results").html(response);
    },
  });
}

// getting the details of individual cast
function get_individual_cast(movie_cast, my_api_key) {
  cast_bdays = [];
  cast_bios = [];
  cast_places = [];
  for (var cast_id in movie_cast.cast_ids) {
    $.ajax({
      type: "GET",
      url:
        "https://api.themoviedb.org/3/person/" +
        movie_cast.cast_ids[cast_id] +
        "?api_key=" +
        my_api_key,
      async: false,
      success: function (cast_details) {
        cast_bdays.push(
          new Date(cast_details.birthday)
            .toDateString()
            .split(" ")
            .slice(1)
            .join(" ")
        );
        if (cast_details.biography) {
          cast_bios.push(cast_details.biography);
        } else {
          cast_bios.push("Not Available");
        }
        if (cast_details.place_of_birth) {
          cast_places.push(cast_details.place_of_birth);
        } else {
          cast_places.push("Not Available");
        }
      },
    });
  }
  return {
    cast_bdays: cast_bdays,
    cast_bios: cast_bios,
    cast_places: cast_places,
  };
}

// getting the details of the cast for the requested movie
function get_movie_cast(movie_id, my_api_key) {
  cast_ids = [];
  cast_names = [];
  cast_chars = [];
  cast_profiles = [];
  top_10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  $.ajax({
    type: "GET",
    url:
      "https://api.themoviedb.org/3/movie/" +
      movie_id +
      "/credits?api_key=" +
      my_api_key,
    async: false,
    success: function (my_movie) {
      if (my_movie.cast.length > 0) {
        if (my_movie.cast.length >= 10) {
          top_cast = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        } else {
          top_cast = [0, 1, 2, 3, 4];
        }
        for (var my_cast in top_cast) {
          cast_ids.push(my_movie.cast[my_cast].id);
          cast_names.push(my_movie.cast[my_cast].name);
          cast_chars.push(my_movie.cast[my_cast].character);
          if (my_movie.cast[my_cast].profile_path) {
            cast_profiles.push(
              "https://image.tmdb.org/t/p/original" +
                my_movie.cast[my_cast].profile_path
            );
          } else {
            cast_profiles.push("static/default.jpg");
          }
        }
      }
    },
    error: function (error) {
      alert("Invalid Request! - " + error);
      $("#loader").delay(500).fadeOut();
    },
  });

  return {
    cast_ids: cast_ids,
    cast_names: cast_names,
    cast_chars: cast_chars,
    cast_profiles: cast_profiles,
  };
}
