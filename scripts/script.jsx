// The app (based around using React, Firebase and local storage)
// Only one component in this version
// State initialized with a boolean describing whether the user has clicked the join button (joined), another boolean describing whether the app needs to be scolled down (scrollDown), and an array of chat objects (chats)
// Meant as casual chat app which is why user data is stored in local storage, and nothing is permanent

class App extends React.Component{
    constructor(props){
        super(props);
        
        this.state = {
            joined: false,
            scrollDown: false,
            chats: []
        }
        
        this.joinApp = this.joinApp.bind(this);
        this.createChat = this.createChat.bind(this);
        this.startChat = this.startChat.bind(this);
    }
    
    startChat(){
        // Interval for updating chat
        setInterval(() => {
            // Query Firebase for chats database and order by the timestamp in milliseconds
            let query = firebase.database().ref("chats").orderByChild("timestamp");
            
            // Get joinedTime so we can filter out chats before we joined
            let joinedTime = parseInt(localStorage.getItem("joined-time"));
           
            query.once("value", snapshot => {
                //console.log(snapshot.hasChildren());
                //console.log(this.state.chats);
                // Loop through all chats
                snapshot.forEach(snap => {
                    // The individual chat
                    var data = firebaseGetChildren(snap);
                    
                    // If chat userId is not ours and if it is not in our known users give that user a new color scheme and insert it into known-users array
                    let userId = localStorage.getItem("user-id");
                    if(data.userId !== userId){
                        let knownUsers = JSON.parse(localStorage.getItem("known-users"));
                        console.log(knownUsers);
                        
                        if(!(data.userId in knownUsers)){
                            var scheme = new ColorScheme;
                            var rand = Math.ceil(Math.random()*350);
                            scheme.from_hue(rand)         
                            .scheme('mono')   
                            .variation('hard');

                            var colors = scheme.colors();
                            
                            knownUsers[data.userId] = {
                                primary: colors[0],
                                secondary: colors[3]
                            };
                            localStorage.setItem("known-users", JSON.stringify(knownUsers));
                        }
                        //console.log(knownUsers);
                    }
                    //console.log(data.timestamp, joinedTime);
                    // Filter chats after the time we joined and insert them into chats array
                    if(data.timestamp > joinedTime){
                        if(!this.state.chats.some(e => e.timestamp === data.timestamp)){
                            var chatState = this.state.chats;
                            chatState.push(data);
                            this.setState({
                                chats: chatState 
                            });
                        }
                    }
                });
            }).then(data => {
                console.log("Chat Updated");
                // Scrolldown chat bar if needed
                if(this.state.scrollDown === false){
                    var chatDiv = document.getElementById("chat-area");
                    chatDiv.scrollTop = chatDiv.scrollHeight;
                    this.setState({
                        scrollDown: true
                    });
                }
            }).catch(function(e){
                console.log(e);
            })
        }, 800);
    }
    
    createChat(e){
        e.preventDefault();
        
        let content = document.getElementById("create-chat-input").value;
        
        // If value of input field has something proceed
        if(content != ""){
            let time = new Date().getTime();
            let user = localStorage.getItem("user-name");
            let chatId = firebase.database().ref().push().key;
            let userId = localStorage.getItem("user-id");

            // Insert the chat into our database
            firebase.database().ref("chats/"+chatId).set({
                content: content,
                timestamp: time,
                user: user,
                userId: userId
            });
        }
        
        let chatDiv = document.getElementById("chat-area");
        chatDiv.scrollTop = chatDiv.scrollHeight;
        
        e.target.reset();
    }
    
    joinApp(e){
        e.preventDefault();
        
        // If the localstorage already has joined-chat item no need to initialize the other items
        let joined = localStorage.getItem("joined-chat");
        if(joined === null){
            let date = new Date();
            localStorage.setItem("joined-chat", true);
            localStorage.setItem("joined-time", date.getTime());
            localStorage.setItem("user-id", firebase.database().ref().push().key);
            localStorage.setItem("user-name", generateName());
            // Used in identifying which users have sent a chat since we joined and give them a random color scheme
            let defaultObj = {
                DEFAULTID: {
                    primary: "#4286f4",
                    secondary: "#4286f4"
                }
            };
            localStorage.setItem("known-users", JSON.stringify(defaultObj));
            
            // Create a random colorscheme with two similar HEX colors 
            var scheme = new ColorScheme;
            var rand = Math.ceil(Math.random()*350);
            scheme.from_hue(rand)         
            .scheme('mono')   
            .variation('hard');
            
            // See more at https://github.com/c0bra/color-scheme-js
            var colors = scheme.colors();
            
            // Colors for chats that we send
            localStorage.setItem("primary-color", colors[0]);
            localStorage.setItem("secondary-color", colors[3]);
        }
        
        this.setState({
            joined: true
        });
        
        this.startChat();
    }
    
    render(){
        if(!this.state.joined){
            // Join Button
            return(
                <div>
                    <div id="joinButtonWrapper">
                        <button id="joinButton" onClick={this.joinApp}>Join App</button>
                    </div>
                </div>
            );
        } else {
            return(
                <div id="container">
                    <div id="chat-area">
                        {this.state.chats.map(function(chat){
                            let userId = localStorage.getItem("user-id");
                            
                            // If the chat is from us get our color scheme and style the chat with it
                            if(chat.userId === userId){
                                let primary = "#"+localStorage.getItem("primary-color");
                                let secondary = "#"+localStorage.getItem("secondary-color");

                                let divStyle = {
                                    backgroundColor: primary
                                }

                                let hStyle = {
                                    color: secondary
                                };
                                
                                return (
                                    <div className="current-user-chat" style={divStyle}>
                                        <h5 style={hStyle}>{chat.user}</h5>
                                        <p>{chat.content}</p>
                                    </div>
                                )
                            } else {
                                let knownUsers = JSON.parse(localStorage.getItem("known-users"));
                                
                                // If the chat is from a known user get their color scheme and style the chat with it
                                if(chat.userId in knownUsers){
                                    let primary = "#"+knownUsers[chat.userId].primary;
                                    let secondary = "#"+knownUsers[chat.userId].secondary;
                                    
                                    let divStyle = {
                                        backgroundColor: primary
                                    }

                                    let hStyle = {
                                        color: secondary
                                    };
                                    
                                    return (
                                        <div className="chat" style={divStyle}>
                                            <h5 style={hStyle}>{chat.user}</h5>
                                            <p>{chat.content}</p>
                                        </div>
                                    )
                                // In case we miss identifying a known user give the chat no styling    
                                } else {
                                    
                                    return (
                                        <div className="chat">
                                            <h5>{chat.user}</h5>
                                            <p>{chat.content}</p>
                                        </div>
                                    )
                                    
                                }
                            }
                        })}
                    </div>
                    {/* Form for sending new chat */}
                    <div id="create-chat-area">
                        <form onSubmit={this.createChat}>
                            <input id="create-chat-input" type="text" name="create-chat" autocomplete="off"></input>
                            <button type="submit"><span className="button-text">Send</span><span className="button-icon"><i className="fa fa-paper-plane" aria-hidden="true"></i></span></button>
                        </form>
                    </div>
                </div>
            );
        }
    }
}

// Function for formatting firebase data into usable object 
function firebaseGetChildren(snapshot){
    var obj = {};
    snapshot.forEach(function(child){
        obj[child.key] = child.val();
    });
    return obj;
}

// Render the app
ReactDOM.render(<App/>, document.getElementById("root"));