from flask import Flask, render_template, session, request, url_for, redirect, flash, abort, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
# from models import User

import pickle
import pandas as pd
import requests
import json

from os import path


DB_NAME = "database.db"

def create_database(app):
    if not path.exists("./" + DB_NAME):
        db.create_all(app=app)
        print("Created database!")

movies_dict = pickle.load(open("movie_list.pkl", "rb"))
movies = pd.DataFrame(movies_dict)
similarity = pickle.load(open("similarity.pkl", "rb"))

app = Flask(__name__)
app.config['SECRET_KEY'] = "secrett"
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_NAME}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
# bcrypt = Bcrypt(app)


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(15), unique=True)
    email = db.Column(db.String(50), unique=True)
    password = db.Column(db.String())


create_database(app)

login_manager = LoginManager()
login_manager.login_view = "login"
login_manager.init_app(app)

@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))



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
@login_required
def home():
    return render_template('home.html')

@app.route("/login", methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get("email")
        password = request.form.get("password")

        user = User.query.filter_by(email=email).first()
        if user:
            if check_password_hash(user.password, password):
                flash("Logged in!", category='success')
                login_user(user, remember=True)
                return redirect(url_for('home'))
            else:
                flash('Password is incorrect.', category='error')
        else:
            flash('Email does not exist.', category='error')

    return render_template("login.html")

@app.route("/signup", methods=['GET', 'POST'])
def sign_up():
    if request.method == 'POST':
        print("asdasdas")
        email = request.form.get("email")
        username = request.form.get("username")
        password1 = request.form.get("password1")
        password2 = request.form.get("password2")

        email_exists = User.query.filter_by(email=email).first()
        username_exists = User.query.filter_by(username=username).first()

        if email_exists:
            flash('Email is already in use.', category='error')
        elif username_exists:
            flash('Username is already in use.', category='error')
        elif password1 != password2:
            flash('Passwords don\'t match!', category='error')
        # elif len(username) < 2:
        #     flash('Username is too short.', category='error')
        # elif len(password1) < 6:
        #     flash('Password is too short.', category='error')
        # elif len(email) < 4:
        #     flash("Email is invalid.", category='error')
        else:
            new_user = User(email=email, username=username, password=generate_password_hash(password1, method='sha256'))
            db.session.add(new_user)
            db.session.commit()
            login_user(new_user, remember=True)
            flash('User created!')
        return redirect(url_for('home'))

    return render_template("signup.html")

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))


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
