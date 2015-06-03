from bottle import route, run
import sys
import threading
import time
import queue
import spotify

s = spotify.Session()
l = spotify.EventLoop(s)
l.start()
a = spotify.PortAudioSink(s)
logged_in = threading.Event()
end_of_track = threading.Event()

def on_connection_state_updated(session):
    if session.connection.state is spotify.ConnectionState.LOGGED_IN:
        logged_in.set()

def on_end_of_track(self):
    end_of_track.set()

s.on(
    spotify.SessionEvent.CONNECTION_STATE_UPDATED,
    on_connection_state_updated
)
s.on(
    spotify.SessionEvent.END_OF_TRACK, on_end_of_track
)

s.relogin()

logged_in.wait()

def spotify_thread():
    while True:
        while q.empty():
            pass
        t = q.get().load()
        s.player.load(t)
        s.player.play()
        global current_track
        current_track = t
        while not end_of_track.wait(0.4):
            pass

st = threading.Thread(name='spotify_player', target=spotify_thread)
q = queue.Queue()
current_track = None

@route('/queue/<id>')
def queue(id):
    t = s.get_track(id).load()
    q.put(t)
    return 'OK'

@route('/queue')
def get_queue():
    if current_track != None:
        current = current_track.link.uri
    else:
        current = None
    queue = [n.link.uri for n in q.queue]
    return {'current': current,'queue':queue}

@route('/current')
def get_current():
    return str(current_track)

@route('/')
def index():
    return static_file('index.html', root='/site')

st.start()
run(ded=True)
