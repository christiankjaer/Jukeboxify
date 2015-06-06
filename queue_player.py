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

def on_connection_state_updated(session):
    if session.connection.state is spotify.ConnectionState.LOGGED_IN:
        logged_in.set()

def on_end_of_track(self):
    end_of_track.set()

def music_hijacked(session):
    session.player.play()

s.on(
    spotify.SessionEvent.CONNECTION_STATE_UPDATED,
    on_connection_state_updated
)
s.on(
    spotify.SessionEvent.END_OF_TRACK, on_end_of_track
)

s.on(
    spotify.SessionEvent.PLAY_TOKEN_LOST, music_hijacked
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
                current_track = None
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
    return 'ok'

@route('/queue')
def get_queue():
    if current_track != None:
        current = current_track.link.uri
    else:
        current = None
    queue = [n.link.uri for n in q.queue]
    return {'current': current,'queue':queue}

@route('/playlists')
def get_playlists():
    pc = s.playlist_container.load()
    return {'playlists': [{'name': p.name, 'uri': p.link.uri} for p in pc if type(p) == spotify.Playlist]}

@route('/delete/<id:int>')
def delete_from_queue(id):
    del q.queue[id]
    return 'ok'
    
@route('/set_playlist/<id>')
def set_playlist(id):
    global p
    p = s.get_playlist(id).load()
    return 'ok'

@route('/')
def index():
    return static_file('index.html', root='site')

@route('/play')
def play():
    s.player.play()
    return 'ok'

@route('/pause')
def pause():
    s.player.pause()
    return 'ok'

@route('/skip')
def skip():
    s.player.unload()
    end_of_track.set()
    return 'ok'

@route('/admin')
def index():
    return static_file('admin.html', root='site')

@route('/site/:filename#.*#')
def send_static(filename):
    return static_file(filename, root='site/')

st.start()
run(host='0.0.0.0', port=80)
