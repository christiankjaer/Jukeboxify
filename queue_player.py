from flask import Flask, jsonify
import sys
import threading
import time
import Queue
import spotify

app = Flask(__name__)

s = spotify.Session()
l = spotify.EventLoop(s)
l.start()
a = spotify.AlsaSink(s)
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
        while not end_of_track.wait(0.1):
            pass

st = threading.Thread(name='spotify_player', target=spotify_thread)
q = Queue.Queue()
current_track = None

st.start()


@app.route('/queue/<id>')
def queue(id):
    t = s.get_track(id).load()
    q.put(t)
    return 'OK'

@app.route('/queue')
def get_queue():
    if current_track != None:
        current = {'artist': current_track.load().artists[0].load().name, 'name': current_track.load().name}
    else:
        current = None
    queue = [{'artist':n.load().artists[0].load().name, 'name':n.load().name} for n in q.queue]
    return jsonify({'current': current,'queue':queue})

@app.route('/current')
def get_current():
    return jsonify({
        'artist': current_track.load().artists[0].load().name,
        'name': current_track.load().name})

if __name__ == '__main__':
    app.run(debug=True)
