var PlaylistSelector = React.createClass({
    getPlaylists: function() {
        $.ajax({
            url: 'playlists',
            datatype: 'json',
            success: function(data) {
                this.setState({data: data.playlists});
            }.bind(this)
        })
    },
    changePlaylist: function(e) {
        select = React.findDOMNode(this.refs.change);
        index = select.selectedIndex;
        $.ajax('set_playlist/'+ select[index].value);
    },
    getInitialState: function() {
        return {data: []}
    },
    componentDidMount: function() {
        this.getPlaylists();
    },
    render: function () {
        ps = this.state.data.map(function(playlist, index) {
            return(<option value={playlist.uri} key={index}>{playlist.name}</option>)
        });
        return(
            <select className="form-control" onChange={this.changePlaylist} ref="change">
                <option selected disables>Choose here</option>
                {ps}                
            </select>
        );
    }
});
var QueueEditor = React.createClass({
    getQueue: function() {
        $.ajax({
            url: 'queue',
            dataType: 'json',
            success: function(data) {
                this.setQueue(data.queue);
            }.bind(this),
            error: function(xhr, status, err) {
                console.error(status, err.toString());
            }.bind(this)
        })
    },
    setQueue: function(queue) {
        if (queue.length > 0) {
            tids = queue.map(function(uri, index) {
                return uri.split(':')[2];
            });
            $.ajax({
                url: 'https://api.spotify.com/v1/tracks',
                dataType: 'json',
                cache: true,
                data: {ids: tids.toString()},
                success: function(data) {
                    tracks = data.tracks.map(function(track, index) {
                        return track.artists[0].name + ' - ' + track.name
                    });
                    this.setState({queue: tracks})
                }.bind(this)
            });
        } else {
            this.setState({ queue: []})
        }
    },
    handleDelete: function(index) {
        $.ajax('delete/'+index);
    },
    getInitialState: function() {
        return {queue: []};
    },
    componentDidMount: function() {
        this.getQueue();
        setInterval(this.getQueue, this.props.pollInterval);
    },
    render: function() {
        if (this.state.queue.length > 0) {
            queue = this.state.queue.map(function(track, index) {
                var boundClick = this.handleDelete.bind(this, index);
                return(
                    <li className="list-group-item" key={index}>
                        {track}
                        <span className="glyphicon glyphicon-remove-sign pull-right" onClick={boundClick}></span>
                    </li>)
            }.bind(this));
        } else {
            queue = <li className="list-group-item">Nothing in queue</li>
        }
        return(
            <div className="panel panel-default">
                <div className="panel-heading">Queue</div>
                <div className="panel-body">
                    <ul className="list-group">
                        {queue}
                    </ul>
                </div>
            </div>
        );
    }
});
React.render(
    <div className="container">
        <nav className="navbar navbar-default">
            <div className="container-fluid">
                <span className="navbar-brand">Jukeboxify Admin</span>
            </div>
        </nav>

        <div className="row">
            <div className="col-sm-12">
                <div className="panel panel-default">
                    <div className="panel-heading">Default playlist</div>
                    <div className="panel-body">
                        <PlaylistSelector />
                    </div>
                </div>
                <QueueEditor pollInterval={500} />
                <div className="panel panel-default">
                    <div className="panel-heading">Controls</div>
                    <div className="panel-body">
                        <button className="btn btn-default" onClick={function() {$.ajax('play')}}>Play</button>
                        <button className="btn btn-default" onClick={function() {$.ajax('pause')}}>Pause</button>
                        <button className="btn btn-default" onClick={function() {$.ajax('skip')}}>Skip</button>
                    </div>
                </div>
            </div>
        </div>
    </div>,
    document.getElementById('container')
);
