import React, { Component } from 'react'
import DispatchAPI from '../../api/dispatch'

import Cookies from 'js-cookie'
import PollAnswer from './PollAnswer.jsx'

const COLOR_OPACITY = .8

class Poll extends Component {
  constructor(props) {
    super(props);
    this.state = {
      answers: [],
      answer_ids: [],
      votes: [],
      checkedAnswers: [],
      hasVoted: false,
      pollQuestion: '',
      loading: true,
      totalVotes: 0,
      showResults: false,
      pollOpen: true,
    }
  }

  getCookieName() {
    return 'poll_id_' + String(this.props.id)
  }

  getCookie(field) {
    let cookie = Cookies.get(this.getCookieName())
    if(typeof cookie === 'string' && cookie !== '') {
      cookie = JSON.parse(cookie)
      if(field) {
        return cookie[field]
      }
      return cookie
    }
    return cookie
  }

  setCookie(vote_id, answer_id, init) {
    if(this.state.pollOpen || init) {
      Cookies.set(
        this.getCookieName(),
        {pole_id: this.props.id, vote_id: vote_id, answer_id: answer_id},
        { path: '/' }
      )
    }
  }

  componentDidMount() {
    let init = true
    let answer_id = Number(this.getCookie('answer_id'))
    this.update(init, answer_id)
  }

  update(init, answer_id) {
    DispatchAPI.polls.getResults(this.props.id)
    .then((response)=> {
      let answers = []
      let votes = []
      let answer_ids = []
      let vote_id = this.getCookie('vote_id')

      for(let answer of response.answers) {
        answers.push(answer['name'])
        votes.push(answer['vote_count'])
        answer_ids.push(answer['id'])
      }

      if(init) {
        let cookie = this.getCookie()
        if(!cookie || !cookie.answer_id) {
          this.setCookie(vote_id, answer_ids[0], true)
        }
      }

      let totalVotes = response.total_votes
      this.setState({
        answers: answers,
        answer_ids: answer_ids,
        votes: votes,
        vote_id: vote_id,
        pollQuestion: response.question,
        loading: false,
        totalVotes: totalVotes,
        showResults: response.show_results,
        pollOpen: response.is_open
      }, () => {
        if(answer_id) {
          let checkedAnswers = this.state.checkedAnswers.concat(this.state.answer_ids.indexOf(answer_id))
          this.setState({
            hasVoted: true,
            checkedAnswers: checkedAnswers
          })
        }
      })
    })
  }

  changeAnswers(e, index) {
    if(!this.state.hasVoted) {
      let deselect = false
      let newCheckedAnswers = this.state.checkedAnswers

      if(this.state.checkedAnswers.includes(index)) {
        newCheckedAnswers.splice(this.state.checkedAnswers.indexOf(index), 1)
        deselect = true
      }

      if(!this.props.many) {
        newCheckedAnswers = []
        newCheckedAnswers.push(index)
      }

      else if(this.props.many) {
        newCheckedAnswers.push(index)
      }

      this.setState({
        checkedAnswers: newCheckedAnswers,
        hasVoted: true
      }, () => {
        if(!deselect) {
          this.vote();
        }
      })
    }
  }

  vote() {
    for(let index of this.state.checkedAnswers) {
      let payload = {poll_id: this.props.id, vote_id: this.state.vote_id, answer_id: this.state.answer_ids[this.state.checkedAnswers[0]]}
      DispatchAPI.polls.vote(this.props.id, payload).then(response => {
        this.setCookie(response.id, this.state.answer_ids[index])
        this.update()
      })
    }
  }

  getPollResult(index) {
    if(this.state.showResults) {
      let width = 0

      if(this.state.totalVotes !== 0) {
        width = String((100*this.state.votes[index]/this.state.totalVotes).toFixed(0)) + '%'
      }
      
      return width
    }
  }

  renderPollClosed() {
    return(
      <div className={'poll-overlay'}>
        <span><h2>This poll is currently closed</h2></span>
      </div>
    )
  }

  renderLoadingPoll() {
    return(
      // <span dangerouslySetInnerHTML={{__html: this.props.loaderHTML}}> </span>
      <span></span>
    )
  }

  renderShowResults(totalVotes) {
    return(
      <div>
        <i style={{position: 'relative', top: '-5px'}}>Total Votes: {totalVotes}</i>
        <br/>
        <button className={'poll-edit-button'} onClick={() => this.setState({hasVoted: false})}>Change Vote</button>
      </div>
    )
  }

  renderNoResults() {
    return(
      <div>
        <p>Poll results hidden from public</p>
        <h3>Thank you for your opinion</h3>
      </div>
    )
  }

  render() {
    const { answers, checkedAnswers, hasVoted, pollQuestion, many,
      loading, totalVotes, showResults, pollOpen} = this.state

    const pollResult = hasVoted ? 'poll-results' : 'poll-voting'
    const pollFocus = pollOpen ? '' : 'poll-de-focus'
    const buttonStyle = hasVoted ? 'poll-button-voted': 'poll-button-no-vote'
    const showResult = showResults ? (hasVoted ? COLOR_OPACITY : 0) : 0
    const notShowResult = showResults ? (hasVoted ? 0 : COLOR_OPACITY) : COLOR_OPACITY
    return (
      <div className={'poll-wrapper'}>
        {!loading &&
          <div className={['poll-container', pollResult].join(' ')}>
            <div className={['poll-inner-container', pollFocus].join(' ')}>
              <h1>{pollQuestion}</h1>
              <form className={'poll-answer-form'}>
                {answers.map((answer, index) =>{
                  let isSelected = checkedAnswers.includes(index) ? 'poll-selected' : 'poll-not-selected'
                  let buttonSelected = checkedAnswers.includes(index) ? 'poll-button-selected' : 'poll-button-not-selected'
                  let answerPercentage = this.getPollResult(index)
                  return (
                    <PollAnswer
                      key={answer}
                      many={many}
                      index={index}
                      answer={answer}
                      hasVoted={hasVoted}
                      showResults={showResults}
                      checkedAnswers={checkedAnswers}
                      answerPercentage={answerPercentage}
                      changeAnswers={(e) => this.changeAnswers(e, index)}
                      />
                  )
                })}
              </form>
            </div>
            { !pollOpen && this.renderPollClosed() }
          </div>
        }
        { (pollOpen && hasVoted && showResults) && this.renderShowResults(totalVotes) }
        { (pollOpen && hasVoted && !showResults) && this.renderNoResults() }
        { loading && this.renderLoadingPoll() }
      </div>
    )
  }
}

export default Poll