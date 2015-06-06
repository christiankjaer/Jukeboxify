var NowPlayingBox = React.createClass({
    getNowPlaying: function() {
        $.ajax({
            url: 'queue',
            dataType: 'json',
            success: function(data) {
                this.setNowPlaying(data.current);
                this.setQueue(data.queue);
            }.bind(this),
            error: function(xhr, status, err) {
                console.error(status, err.toString());
            }.bind(this)
        })
    },
    setNowPlaying: function(uri) {
        if (uri) {
            tid = uri.split(':')[2];
            $.ajax({
                url: 'https://api.spotify.com/v1/tracks/' + tid,
                dataType: 'json',
                cache: true,
                success: function(data) {
                    np = {
                        artist: data.artists[0].name,
                        track: data.name,
                        img: data.album.images[0].url
                    };
                    this.setState({data: {current: np, queue: this.state.data.queue}});
                }.bind(this)
            });
        } else {
            this.setState({data: {current: null, queue: this.state.data.queue}});
        }
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
                    this.setState({data: {current: this.state.data.current, queue: tracks}})
                }.bind(this)
            });
        } else {
            this.setState({data: {current: this.state.data.current, queue: []}})
        }
    },
    getInitialState: function() {
        return {data: {current: null, queue: []}};
    },
    componentDidMount: function() {
        this.getNowPlaying();
        setInterval(this.getNowPlaying, this.props.pollInterval);
    },
    render: function() {
        if (!this.state.data.current) {
            this.state.data.current = "Nothing";
        }
        np =
            <div className="panel panel-default">
                <div className="panel-heading">Now playing</div>
                <div className="panel-body">
                    <p><img className="img-thumbnail img-responsive" src={this.state.data.current.img} /></p>
                    <p><strong>{this.state.data.current.track}</strong></p>
                    <p>{this.state.data.current.artist}</p>
                </div>
            </div>
            if (this.state.data.queue.length > 0) {
                queue = this.state.data.queue.map(function(track, index) {
                    return(<li className="list-group-item" key={index}>{track}</li>)
                });
            } else {
                queue = <li className="list-group-item">Nothing in queue</li>
            }
            return(
                <div>
                    {np}
                    <div className="panel panel-default">
                        <div className="panel-heading">Queue</div>
                        <div className="panel-body">
                            <ul className="list-group">
                                {queue}
                            </ul>
                        </div>
                    </div>
                </div>
            );
    }
});
var Track = React.createClass({
    render: function() {
        return(
            <tr onClick={this.handleClick}>
                <td width="70px">
                    <img src={this.props.imgurl} />
                </td>
                <td>
                    <p><strong>{this.props.title}</strong></p>
                    <p>{this.props.artist}</p>
                </td>
            </tr>
        );
    },
    handleClick: function(event) {
        $.ajax('queue/' + this.props.uri);
        $(React.findDOMNode(this)).fadeOut(1000);
    }
});
var SearchResult = React.createClass({
    render: function() {
        if (this.props.tracks.length > 0) {
            var boxes = this.props.tracks.map(function(track, index) {
                return(
                    <Track imgurl={track.album.images[2].url} artist={track.artists[0].name} title={track.name} uri={track.uri} key={index}/>
                );
            });
        } else {
            return <h2>Nothing found</h2>;
        }
        return (
            <table className="table">
                <tbody>
                    {boxes}
                </tbody>
            </table>
        );
    }

});
var SearchBox = React.createClass({
    getSearchResults: function(query) {
        if (query) {
            $.ajax({
                url: 'https://api.spotify.com/v1/search',
                dataType: 'json',
                data: {q: query, type: 'track', market: 'DK'},
                cache: false,
                success: function(data) {
                    this.setState({tracks: data.tracks.items});
                }.bind(this),
                error: function(xhr, status, err) {
                    console.error(status, err.toString());
                }.bind(this)
            })
        }
    },
    getInitialState: function() {
        return {tracks: []};
    },
    componentDidMount: function() {
        this.getSearchResults();
    },
    render: function() {
        return(
            <div className="searchBox">
                <p><SearchForm onSearch={this.getSearchResults}/></p>
                <SearchResult tracks={this.state.tracks} />
            </div>
        );
    }

});
var SearchForm = React.createClass({
    handleSubmit: function(e) {
        e.preventDefault();
        var query = React.findDOMNode(this.refs.query).value.trim();
        if (!query) {
            return;
        }
        React.findDOMNode(this.refs.query).value = '';
        this.props.onSearch(query)
    },
    componentDidMount: function() {
        //$('.form-control').onScreenKeyboard({
        //    rewireReturn: 'submit'
        //});
    },
    render: function() {
        return (
            <form className="form-inline" onSubmit={this.handleSubmit}>
                <div className="form-group">
                    <input className="form-control" type="text" placeholder="Search here..." ref="query" />
                </div>
                <button className="btn btn-default" type="submit">Search</button>
            </form>
        );
    }
});
React.render(
    <div className="container">
        <nav className="navbar navbar-default">
            <div className="container-fluid">
                <span className="navbar-brand">Jukeboxify</span>
            </div>
        </nav>
        <div className="row">
            <div className="col-sm-8">
                <SearchBox />
            </div>
            <div className="col-sm-4">
                <NowPlayingBox pollInterval={2000}/>
            </div>
        </div>
    </div>,
    document.getElementById('container')
);
