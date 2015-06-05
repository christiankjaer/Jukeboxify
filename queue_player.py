from bottle import route, run, static_file, redirect
import sys
import threading
import time
import queue
import spotify
import random

s = spotify.Session()
l = spotify.EventLoop(s)
l.start()
a = spotify.PortAudioSink(s)
logged_in = threading.Event()
end_of_track = threading.Event()
music_paused = threading.Event()

def on_connection_state_updated(session):
    if session.connection.state is spotify.ConnectionState.LOGGED_IN:
        logged_in.set()

def on_end_of_track(self):
    end_of_track.set()

def music_paused(session):
    session.player.play()

s.on(
    spotify.SessionEvent.CONNECTION_STATE_UPDATED,
    on_connection_state_updated
)
s.on(
    spotify.SessionEvent.END_OF_TRACK, on_end_of_track
)

s.on(
    spotify.SessionEvent.PLAY_TOKEN_LOST, music_paused
)

s.relogin()

logged_in.wait()

def spotify_thread():
    global current_track
    while True:
        if q.empty():
            if p:
                add_random_track_from_playlist(p)
            else:
                continue
        t = q.get().load()
        s.player.load(t)
        s.player.play()
        end_of_track.clear()
        current_track = t
        while not end_of_track.wait(0.4):
            pass
        q.task_done()

st = threading.Thread(name='spotify_player', target=spotify_thread)
st.daemon = True
q = queue.Queue()
p = None
current_track = None

def add_random_track_from_playlist(p):
    q.put(random.choice(p.tracks))    

@route('/queue/<id>')
def queue(id):
    t = s.get_track(id)
    q.put(t)
    return redirect('/')

@route('/queue')
def get_queue():
    if current_track != None:
        current = current_track.link.uri
    else:
        current = None
    queue = [n.link.uri for n in q.queue]
    return {'current': current,'queue':queue}

@route('/set_playlist/<id>')
def set_playlist(id):
    global p
    p = s.get_playlist(id).load()

@route('/')
def index():
    return static_file('index.html', root='site')

@route('/site/:filename#.*#')
def send_static(filename):
    return static_file(filename, root='site/')

st.start()
run(ded=True)
