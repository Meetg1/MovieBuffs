from flask import Flask, render_template, request
import pickle
import pandas as pd
import requests
import json

movies_dict = pickle.load(open("movie_list.pkl", "rb"))
movies = pd.DataFrame(movies_dict)
similarity = pickle.load(open("similarity.pkl", "rb"))

app = Flask(__name__)


def fetch_poster(movie_id):
    url = "https://api.themoviedb.org/3/movie/{}?api_key=798a8793eacee68e7fdc971d4dec3815&language=en-US".format(
        movie_id
    )
    # print(url)
    data = requests.get(url)
    data = data.json()
    # print(data)
    # data=json.loads(data)
    poster = data["poster_path"]
    full_path = "https://image.tmdb.org/t/p/w500/" + poster

    return full_path


@app.route("/")
def hello_world():
    return render_template("home.html")


@app.route("/recommend")
def recommendation():
    movie = "Titan A.E."
    index = movies[movies["title"] == movie].index[0]
    distances = sorted(
        list(enumerate(similarity[index])), reverse=True, key=lambda x: x[1]
    )
    recommend_movies = []
    recommended_movie_images = []
    for i in distances[1:6]:
        recommend_movies.append(movies.iloc[i[0]].title)
        movie_id = movies.iloc[i[0]].movie_id
        recommended_movie_images.append(fetch_poster(movie_id))

    data = {
        "recommend_movies": recommend_movies,
        "recommended_movie_images": recommended_movie_images,
    }
    return render_template("recomend.html", data=data)


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=7000)
